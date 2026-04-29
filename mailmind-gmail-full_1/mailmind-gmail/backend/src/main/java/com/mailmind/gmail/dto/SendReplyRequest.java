package com.mailmind.gmail.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendReplyRequest {
    @NotBlank private String emailId;
    @NotBlank private String toEmail;
    @NotBlank private String subject;
    @NotBlank private String body;
    private String threadId;
}
