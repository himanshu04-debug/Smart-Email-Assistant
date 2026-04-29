package com.mailmind.gmail.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiRequest {
    @NotBlank private String emailId;
    @NotBlank private String sender;
    @NotBlank private String subject;
    @NotBlank private String body;
    private String tone = "PROFESSIONAL";   // used only for reply
}
