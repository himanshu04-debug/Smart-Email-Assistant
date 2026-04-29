package com.mailmind.gmail.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

// ── Email DTO ─────────────────────────────────────────────────────────────────
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmailDto {
    private String id;
    private String gmailId;
    private String threadId;
    private String subject;
    private String senderEmail;
    private String senderName;
    private String snippet;
    private String bodyPlain;
    private String bodyHtml;
    private List<String> labelIds;
    private boolean read;
    private boolean starred;
    private boolean important;
    private boolean hasAttachments;
    private Instant receivedAt;
}
