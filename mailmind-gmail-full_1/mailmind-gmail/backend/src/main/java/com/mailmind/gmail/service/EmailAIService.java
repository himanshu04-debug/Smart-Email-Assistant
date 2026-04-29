package com.mailmind.gmail.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mailmind.gmail.dto.AiReplyResponse;
import com.mailmind.gmail.dto.AiSummaryResponse;
import com.mailmind.gmail.model.AiResult;
import com.mailmind.gmail.repository.AiResultRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
@Service
public class EmailAIService {

    private static final String REPLY_PROMPT = """
        You are a professional email assistant. Write a reply to the email below.

        ORIGINAL EMAIL:
        From: {sender}
        Subject: {subject}
        Body:
        {body}

        PAST CONTEXT (from similar emails):
        {context}

        INSTRUCTIONS:
        - Write a {tone} reply
        - Address every key point in the email
        - Sound natural, not robotic
        - Do NOT include a subject line
        - Do NOT add placeholder text like [Your Name]
        - Write only the email body
        """;

    private static final String SUMMARY_PROMPT = """
        Analyze this email and return ONLY a valid JSON object — no markdown, no extra text.

        EMAIL:
        From: {sender}
        Subject: {subject}
        Body:
        {body}

        Return exactly this JSON structure:
        {
          "summary": "2-3 sentence overview",
          "keyPoints": ["point 1", "point 2", "point 3"],
          "actionItems": ["action 1", "action 2"],
          "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
          "tone": "detected tone",
          "deadline": "deadline string or null",
          "sentiment": "POSITIVE|NEUTRAL|NEGATIVE"
        }
        """;

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final AiResultRepository aiResultRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public EmailAIService(ChatModel chatModel, VectorStore vectorStore,
                          AiResultRepository aiResultRepository, ObjectMapper objectMapper) {
        this.chatClient        = ChatClient.builder(chatModel).build();
        this.vectorStore       = vectorStore;
        this.aiResultRepository = aiResultRepository;
        this.objectMapper      = objectMapper;
    }

    // ── Generate reply ────────────────────────────────────────────────────────

    @Async
    public CompletableFuture<AiReplyResponse> generateReply(
            String emailId, String userId, String sender,
            String subject, String body, String tone) {

        long start = System.currentTimeMillis();
        log.info("Generating {} reply for email {}", tone, emailId);

        try {
            String context = retrieveContext(body, userId);

            PromptTemplate tpl = new PromptTemplate(REPLY_PROMPT);
            Prompt prompt = tpl.create(Map.of(
                "sender",  sender,
                "subject", subject,
                "body",    body,
                "context", context,
                "tone",    tone.toLowerCase()
            ));

            var response   = chatClient.prompt(prompt).call().chatResponse();
            String reply   = response.getResult().getOutput().getText();
            int tokens     = response.getMetadata().getUsage() != null
                ? (int) response.getMetadata().getUsage().getTotalTokens() : 0;
            long latency   = System.currentTimeMillis() - start;

            // Persist result
            aiResultRepository.save(AiResult.builder()
                .emailId(emailId).userId(userId)
                .type(AiResult.ResultType.REPLY)
                .resultText(reply).tone(tone)
                .tokensUsed(tokens).latencyMs(latency)
                .modelUsed("gpt-4o").build());

            // Index this email body for future RAG
            indexForRag(emailId, userId, sender, subject, body);

            return CompletableFuture.completedFuture(
                AiReplyResponse.builder()
                    .emailId(emailId).reply(reply).tone(tone)
                    .tokensUsed(tokens).latencyMs(latency)
                    .generatedAt(Instant.now()).build());

        } catch (Exception e) {
            log.error("Reply generation failed: {}", e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }

    // ── Summarise ─────────────────────────────────────────────────────────────

    @Async
    public CompletableFuture<AiSummaryResponse> summarise(
            String emailId, String userId, String sender, String subject, String body) {

        long start = System.currentTimeMillis();

        try {
            PromptTemplate tpl = new PromptTemplate(SUMMARY_PROMPT);
            Prompt prompt = tpl.create(Map.of(
                "sender", sender, "subject", subject, "body", body));

            var response = chatClient.prompt(prompt).call().chatResponse();
            String json  = response.getResult().getOutput().getText().trim();
            int tokens   = response.getMetadata().getUsage() != null
                ? (int) response.getMetadata().getUsage().getTotalTokens() : 0;
            long latency = System.currentTimeMillis() - start;

            // Strip markdown fences if present
            json = json.replaceAll("```json\\s*", "").replaceAll("```", "").trim();
            Map<String, Object> parsed = objectMapper.readValue(json,
                new TypeReference<Map<String, Object>>() {});

            aiResultRepository.save(AiResult.builder()
                .emailId(emailId).userId(userId)
                .type(AiResult.ResultType.SUMMARY)
                .summaryJson(json)
                .tokensUsed(tokens).latencyMs(latency)
                .modelUsed("gpt-4o").build());

            return CompletableFuture.completedFuture(
                AiSummaryResponse.builder()
                    .emailId(emailId)
                    .summary((String) parsed.get("summary"))
                    .keyPoints(castList(parsed.get("keyPoints")))
                    .actionItems(castList(parsed.get("actionItems")))
                    .urgency((String) parsed.getOrDefault("urgency", "MEDIUM"))
                    .tone((String) parsed.getOrDefault("tone", "neutral"))
                    .deadline((String) parsed.get("deadline"))
                    .sentiment((String) parsed.getOrDefault("sentiment", "NEUTRAL"))
                    .tokensUsed(tokens).latencyMs(latency)
                    .generatedAt(Instant.now()).build());

        } catch (Exception e) {
            log.error("Summarisation failed: {}", e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }

    // ── RAG helpers ───────────────────────────────────────────────────────────

    private String retrieveContext(String body, String userId) {
        try {
            List<Document> docs = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query(body).topK(3)
                    .filterExpression("userId == '" + userId + "'")
                    .build());
            return docs.isEmpty() ? "No prior context."
                : docs.stream().map(Document::getText).collect(Collectors.joining("\n---\n"));
        } catch (Exception e) {
            log.warn("RAG retrieval error: {}", e.getMessage());
            return "Context unavailable.";
        }
    }

    private void indexForRag(String emailId, String userId,
                               String sender, String subject, String body) {
        try {
            vectorStore.add(List.of(new Document(
                "From: " + sender + "\nSubject: " + subject + "\n\n" + body,
                Map.of("userId", userId, "emailId", emailId)
            )));
        } catch (Exception e) {
            log.warn("RAG indexing failed: {}", e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> castList(Object obj) {
        if (obj instanceof List<?> l)
            return l.stream().map(Object::toString).collect(Collectors.toList());
        return List.of();
    }

    public java.util.Optional<AiResult> getCachedReply(String emailId) {
        return aiResultRepository.findTopByEmailIdAndTypeOrderByCreatedAtDesc(
            emailId, AiResult.ResultType.REPLY);
    }
    public java.util.Optional<AiResult> getCachedSummary(String emailId) {
        return aiResultRepository.findTopByEmailIdAndTypeOrderByCreatedAtDesc(
            emailId, AiResult.ResultType.SUMMARY);
    }
}
