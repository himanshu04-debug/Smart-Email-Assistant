package com.mailmind.gmail.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "ai_results")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AiResult {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "email_id", nullable = false)
    private String emailId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResultType type;

    @Column(name = "result_text", columnDefinition = "TEXT")
    private String resultText;

    @Column(name = "summary_json", columnDefinition = "jsonb")
    private String summaryJson;

    private String tone;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "model_used")
    private String modelUsed;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist protected void onCreate() { createdAt = Instant.now(); }

    public enum ResultType { REPLY, SUMMARY }
}
