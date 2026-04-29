package com.mailmind.gmail.scheduler;

import com.mailmind.gmail.repository.UserRepository;
import com.mailmind.gmail.service.GmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GmailSyncScheduler {

    private final UserRepository userRepository;
    private final GmailService gmailService;

    /**
     * Syncs Gmail for every connected user every 60 seconds.
     * In production, use per-user Gmail Push Notifications (Pub/Sub)
     * for real-time delivery instead of polling.
     */
    @Scheduled(fixedDelayString = "${app.gmail.poll-interval-ms:60000}",
               initialDelay = 10000)
    public void syncAllUsers() {
        userRepository.findAll().forEach(user -> {
            if (user.getGmailAccessToken() != null) {
                try {
                    int synced = gmailService.syncEmails(user.getId());
                    if (synced > 0) {
                        log.info("Synced {} new emails for {}", synced, user.getEmail());
                    }
                } catch (Exception e) {
                    log.error("Sync failed for {}: {}", user.getEmail(), e.getMessage());
                }
            }
        });
    }
}
