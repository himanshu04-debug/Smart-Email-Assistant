package com.mailmind.gmail.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AiSummaryResponse {
    private String emailId;
    private String summary;
    private List<String> keyPoints;
    private List<String> actionItems;
    private String urgency;
    private String tone;
    private String deadline;
    private String sentiment;
    private int tokensUsed;
    private long latencyMs;
    private Instant generatedAt;
}
