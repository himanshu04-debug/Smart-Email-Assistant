package com.mailmind.gmail.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "emails",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","gmail_id"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Email {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "gmail_id", nullable = false)
    private String gmailId;

    @Column(name = "thread_id")
    private String threadId;

    private String subject;

    @Column(name = "sender_email")
    private String senderEmail;

    @Column(name = "sender_name")
    private String senderName;

    @Column(columnDefinition = "TEXT[]")
    private String[] recipients;

    @Column(length = 500)
    private String snippet;

    @Column(name = "body_plain", columnDefinition = "TEXT")
    private String bodyPlain;

    @Column(name = "body_html", columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "label_ids", columnDefinition = "TEXT[]")
    private String[] labelIds;

    @Builder.Default
    @Column(name = "is_read")
    private boolean read = false;

    @Builder.Default
    @Column(name = "is_starred")
    private boolean starred = false;

    @Builder.Default
    @Column(name = "is_important")
    private boolean important = false;

    @Builder.Default
    @Column(name = "has_attachments")
    private boolean hasAttachments = false;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { createdAt = Instant.now(); }
}
