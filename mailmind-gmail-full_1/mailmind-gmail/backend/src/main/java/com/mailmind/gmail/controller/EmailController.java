package com.mailmind.gmail.controller;

import com.mailmind.gmail.dto.*;
import com.mailmind.gmail.service.GmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/emails")
@RequiredArgsConstructor
public class EmailController {

    private final GmailService gmailService;

    /**
     * List emails — supports filter: inbox | unread | starred | sent | spam
     */
    @GetMapping
    public ResponseEntity<Page<EmailDto>> list(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "inbox") String filter,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(gmailService.listEmails(userId, filter, page, size));
    }

    /**
     * Full-text search across subject, sender, snippet.
     */
    @GetMapping("/search")
    public ResponseEntity<Page<EmailDto>> search(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String q,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(gmailService.search(userId, q, page, size));
    }

    /**
     * Get a single email by local ID (also marks it as read).
     */
    @GetMapping("/{emailId}")
    public ResponseEntity<EmailDto> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String emailId) {
        return ResponseEntity.ok(gmailService.getEmail(userId, emailId));
    }

    /**
     * Star or un-star an email.
     */
    @PatchMapping("/{emailId}/star")
    public ResponseEntity<Void> star(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String emailId,
            @RequestParam boolean starred) {
        gmailService.toggleStar(userId, emailId, starred);
        return ResponseEntity.noContent().build();
    }

    /**
     * Send a reply via the Gmail API — appears in the user's Gmail Sent folder.
     */
    @PostMapping("/reply")
    public ResponseEntity<Map<String, String>> sendReply(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody SendReplyRequest req) {
        try {
            String sentId = gmailService.sendReply(
                userId,
                req.getToEmail(),
                req.getSubject(),
                req.getBody(),
                req.getThreadId()
            );
            log.info("Reply sent for email {} → Gmail message {}", req.getEmailId(), sentId);
            return ResponseEntity.ok(Map.of(
                "status",   "SENT",
                "gmailId",  sentId,
                "message",  "Reply sent via Gmail successfully"
            ));
        } catch (Exception e) {
            log.error("Failed to send reply: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "status",  "ERROR",
                "message", "Failed to send: " + e.getMessage()
            ));
        }
    }

    /**
     * Trigger a manual Gmail sync for the authenticated user.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(
            @RequestHeader("X-User-Id") String userId) {
        int synced = gmailService.syncEmails(userId);
        return ResponseEntity.ok(Map.of(
            "synced", synced,
            "message", synced + " new emails synced from Gmail"
        ));
    }

    /**
     * Unread badge count.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(Map.of("count", gmailService.unreadCount(userId)));
    }
}
