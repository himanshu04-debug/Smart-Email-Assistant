package com.mailmind.gmail.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AiReplyResponse {
    private String emailId;
    private String reply;
    private String tone;
    private int tokensUsed;
    private long latencyMs;
    private Instant generatedAt;
}
