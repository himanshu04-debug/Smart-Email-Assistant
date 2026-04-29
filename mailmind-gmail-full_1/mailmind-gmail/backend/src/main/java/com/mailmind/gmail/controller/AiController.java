package com.mailmind.gmail.controller;

import com.mailmind.gmail.dto.*;
import com.mailmind.gmail.service.EmailAIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final EmailAIService emailAIService;

    /**
     * Generate an AI reply for an email using Spring AI + GPT-4o.
     * Uses RAG (pgvector) to retrieve relevant past emails as context.
     */
    @PostMapping("/reply")
    public CompletableFuture<ResponseEntity<AiReplyResponse>> generateReply(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody AiRequest req) {

        return emailAIService.generateReply(
                req.getEmailId(), userId,
                req.getSender(), req.getSubject(),
                req.getBody(), req.getTone())
            .thenApply(ResponseEntity::ok)
            .exceptionally(ex -> {
                log.error("Reply generation failed: {}", ex.getMessage());
                return ResponseEntity.status(500).build();
            });
    }

    /**
     * Summarise an email — returns key points, action items, urgency, deadline.
     */
    @PostMapping("/summarise")
    public CompletableFuture<ResponseEntity<AiSummaryResponse>> summarise(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody AiRequest req) {

        return emailAIService.summarise(
                req.getEmailId(), userId,
                req.getSender(), req.getSubject(), req.getBody())
            .thenApply(ResponseEntity::ok)
            .exceptionally(ex -> {
                log.error("Summarisation failed: {}", ex.getMessage());
                return ResponseEntity.status(500).build();
            });
    }

    /**
     * Get cached (previously generated) reply for an email.
     */
    @GetMapping("/reply/{emailId}")
    public ResponseEntity<?> getCachedReply(@PathVariable String emailId) {
        return emailAIService.getCachedReply(emailId)
            .map(r -> ResponseEntity.ok(Map.of(
                "emailId",     r.getEmailId(),
                "reply",       r.getResultText(),
                "tone",        r.getTone() != null ? r.getTone() : "PROFESSIONAL",
                "tokensUsed",  r.getTokensUsed(),
                "latencyMs",   r.getLatencyMs(),
                "generatedAt", r.getCreatedAt()
            )))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get cached summary for an email.
     */
    @GetMapping("/summary/{emailId}")
    public ResponseEntity<?> getCachedSummary(@PathVariable String emailId) {
        return emailAIService.getCachedSummary(emailId)
            .map(r -> ResponseEntity.ok(Map.of(
                "emailId",     r.getEmailId(),
                "summaryJson", r.getSummaryJson(),
                "tokensUsed",  r.getTokensUsed(),
                "generatedAt", r.getCreatedAt()
            )))
            .orElse(ResponseEntity.notFound().build());
    }
}
