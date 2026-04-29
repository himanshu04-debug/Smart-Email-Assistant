package com.mailmind.gmail.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.*;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.mailmind.gmail.dto.EmailDto;
import com.mailmind.gmail.model.Email;
import com.mailmind.gmail.model.User;
import com.mailmind.gmail.repository.EmailRepository;
import com.mailmind.gmail.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class GmailService {

    private final UserRepository userRepository;
    private final EmailRepository emailRepository;

    @Value("${app.gmail.max-results:50}")
    private long maxResults;

    private static final String APP_NAME = "MailMind AI";
    private static final String ME       = "me";

    // ── Build Gmail client for a user ──────────────────────────────────────────

    public Gmail buildGmailClient(User user) throws Exception {
        AccessToken accessToken = new AccessToken(
            user.getGmailAccessToken(),
            user.getTokenExpiresAt() != null ? Date.from(user.getTokenExpiresAt()) : null
        );
        GoogleCredentials credentials = GoogleCredentials.create(accessToken);
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

        return new Gmail.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            requestInitializer
        ).setApplicationName(APP_NAME).build();
    }

    // ── Sync emails from Gmail into local DB ──────────────────────────────────

    @Transactional
    public int syncEmails(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        int synced = 0;
        try {
            Gmail gmail = buildGmailClient(user);

            ListMessagesResponse response = gmail.users().messages().list(ME)
                .setMaxResults(maxResults)
                .setQ("in:inbox")
                .execute();

            List<Message> messages = response.getMessages();
            if (messages == null || messages.isEmpty()) return 0;

            for (Message m : messages) {
                if (emailRepository.existsByUserIdAndGmailId(userId, m.getId())) continue;

                // Fetch full message
                Message full = gmail.users().messages().get(ME, m.getId())
                    .setFormat("full")
                    .execute();

                Email email = parseMessage(full, userId);
                emailRepository.save(email);
                synced++;
            }

            log.info("Synced {} new emails for user {}", synced, userId);
        } catch (Exception e) {
            log.error("Gmail sync failed for user {}: {}", userId, e.getMessage(), e);
        }
        return synced;
    }

    // ── Send a reply via Gmail API ────────────────────────────────────────────

    public String sendReply(String userId, String toEmail, String subject,
                             String body, String threadId) throws Exception {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Gmail gmail = buildGmailClient(user);

        // Build RFC-2822 message
        Properties props = new Properties();
        Session session  = Session.getDefaultInstance(props, null);
        MimeMessage mimeMsg = new MimeMessage(session);

        mimeMsg.setFrom(new InternetAddress(user.getEmail(), user.getName()));
        mimeMsg.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(toEmail));
        mimeMsg.setSubject("Re: " + subject);
        mimeMsg.setText(body, "utf-8");

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        mimeMsg.writeTo(buffer);
        String encodedEmail = Base64.getUrlEncoder().encodeToString(buffer.toByteArray());

        Message gmailMessage = new Message();
        gmailMessage.setRaw(encodedEmail);
        if (threadId != null) gmailMessage.setThreadId(threadId);

        Message sent = gmail.users().messages().send(ME, gmailMessage).execute();
        log.info("Reply sent via Gmail API, messageId={}", sent.getId());
        return sent.getId();
    }

    // ── List local emails (already synced) ───────────────────────────────────

    public Page<EmailDto> listEmails(String userId, String filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        Page<Email> emails = switch (filter != null ? filter.toLowerCase() : "inbox") {
            case "unread"   -> emailRepository.findUnreadByUserId(userId, pageable);
            case "starred"  -> emailRepository.findStarredByUserId(userId, pageable);
            case "sent"     -> emailRepository.findByUserIdAndLabel(userId, "SENT", pageable);
            case "spam"     -> emailRepository.findByUserIdAndLabel(userId, "SPAM", pageable);
            default         -> emailRepository.findByUserIdOrderByReceivedAtDesc(userId, pageable);
        };
        return emails.map(this::toDto);
    }

    public Page<EmailDto> search(String userId, String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        return emailRepository.search(userId, query, pageable).map(this::toDto);
    }

    public EmailDto getEmail(String userId, String emailId) {
        Email email = emailRepository.findByUserIdAndId(userId, emailId)
            .orElseThrow(() -> new RuntimeException("Email not found"));
        emailRepository.markAsRead(emailId, userId);
        email.setRead(true);
        return toDto(email);
    }

    @Transactional
    public void toggleStar(String userId, String emailId, boolean starred) {
        emailRepository.setStarred(emailId, userId, starred);
    }

    public long unreadCount(String userId) {
        return emailRepository.countByUserIdAndReadFalse(userId);
    }

    // ── Parse Gmail message → Email entity ───────────────────────────────────

    private Email parseMessage(Message msg, String userId) {
        MessagePart payload    = msg.getPayload();
        List<MessagePartHeader> headers = payload != null ? payload.getHeaders() : List.of();

        String subject    = headerValue(headers, "Subject");
        String from       = headerValue(headers, "From");
        String to         = headerValue(headers, "To");
        String date       = headerValue(headers, "Date");

        String senderName  = parseSenderName(from);
        String senderEmail = parseSenderEmail(from);

        String bodyPlain = extractBody(payload, "text/plain");
        String bodyHtml  = extractBody(payload, "text/html");

        boolean hasAtt = payload != null && payload.getParts() != null &&
            payload.getParts().stream().anyMatch(p ->
                p.getFilename() != null && !p.getFilename().isBlank());

        List<String> labelIds = msg.getLabelIds() != null ? msg.getLabelIds() : List.of();

        return Email.builder()
            .userId(userId)
            .gmailId(msg.getId())
            .threadId(msg.getThreadId())
            .subject(subject != null ? subject : "(no subject)")
            .senderEmail(senderEmail)
            .senderName(senderName)
            .recipients(to != null ? new String[]{to} : new String[0])
            .snippet(msg.getSnippet())
            .bodyPlain(bodyPlain)
            .bodyHtml(bodyHtml)
            .labelIds(labelIds.toArray(new String[0]))
            .read(!labelIds.contains("UNREAD"))
            .starred(labelIds.contains("STARRED"))
            .important(labelIds.contains("IMPORTANT"))
            .hasAttachments(hasAtt)
            .receivedAt(msg.getInternalDate() != null
                ? Instant.ofEpochMilli(msg.getInternalDate()) : Instant.now())
            .build();
    }

    private String headerValue(List<MessagePartHeader> headers, String name) {
        return headers.stream()
            .filter(h -> h.getName().equalsIgnoreCase(name))
            .map(MessagePartHeader::getValue)
            .findFirst().orElse(null);
    }

    private String parseSenderName(String from) {
        if (from == null) return null;
        int lt = from.indexOf('<');
        return lt > 0 ? from.substring(0, lt).trim().replace("\"","") : from;
    }

    private String parseSenderEmail(String from) {
        if (from == null) return null;
        int lt = from.indexOf('<'), gt = from.indexOf('>');
        return (lt >= 0 && gt > lt) ? from.substring(lt + 1, gt) : from;
    }

    private String extractBody(MessagePart part, String mimeType) {
        if (part == null) return null;
        if (mimeType.equals(part.getMimeType()) && part.getBody() != null
                && part.getBody().getData() != null) {
            return new String(
                Base64.getUrlDecoder().decode(part.getBody().getData()),
                StandardCharsets.UTF_8);
        }
        if (part.getParts() != null) {
            for (MessagePart child : part.getParts()) {
                String result = extractBody(child, mimeType);
                if (result != null) return result;
            }
        }
        return null;
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    EmailDto toDto(Email e) {
        return EmailDto.builder()
            .id(e.getId())
            .gmailId(e.getGmailId())
            .threadId(e.getThreadId())
            .subject(e.getSubject())
            .senderEmail(e.getSenderEmail())
            .senderName(e.getSenderName())
            .snippet(e.getSnippet())
            .bodyPlain(e.getBodyPlain())
            .bodyHtml(e.getBodyHtml())
            .labelIds(e.getLabelIds() != null ? Arrays.asList(e.getLabelIds()) : List.of())
            .read(e.isRead())
            .starred(e.isStarred())
            .important(e.isImportant())
            .hasAttachments(e.isHasAttachments())
            .receivedAt(e.getReceivedAt())
            .build();
    }
}
