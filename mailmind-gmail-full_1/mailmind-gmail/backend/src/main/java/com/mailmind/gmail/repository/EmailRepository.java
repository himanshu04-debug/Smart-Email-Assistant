package com.mailmind.gmail.repository;

import com.mailmind.gmail.model.Email;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface EmailRepository extends JpaRepository<Email, String> {

    Page<Email> findByUserIdOrderByReceivedAtDesc(String userId, Pageable pageable);

    @Query("SELECT e FROM Email e WHERE e.userId = :userId AND e.read = false ORDER BY e.receivedAt DESC")
    Page<Email> findUnreadByUserId(String userId, Pageable pageable);

    @Query("SELECT e FROM Email e WHERE e.userId = :userId AND e.starred = true ORDER BY e.receivedAt DESC")
    Page<Email> findStarredByUserId(String userId, Pageable pageable);

    @Query("SELECT e FROM Email e WHERE e.userId = :userId AND :label MEMBER OF e.labelIds ORDER BY e.receivedAt DESC")
    Page<Email> findByUserIdAndLabel(String userId, String label, Pageable pageable);

    @Query("SELECT e FROM Email e WHERE e.userId = :userId AND " +
           "(LOWER(e.subject) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           " LOWER(e.senderEmail) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           " LOWER(e.snippet) LIKE LOWER(CONCAT('%',:q,'%'))) ORDER BY e.receivedAt DESC")
    Page<Email> search(String userId, String q, Pageable pageable);

    Optional<Email> findByUserIdAndGmailId(String userId, String gmailId);
    Optional<Email> findByUserIdAndId(String userId, String id);

    boolean existsByUserIdAndGmailId(String userId, String gmailId);

    long countByUserIdAndReadFalse(String userId);

    @Modifying
    @Query("UPDATE Email e SET e.read = true WHERE e.id = :id AND e.userId = :userId")
    int markAsRead(String id, String userId);

    @Modifying
    @Query("UPDATE Email e SET e.starred = :starred WHERE e.id = :id AND e.userId = :userId")
    int setStarred(String id, String userId, boolean starred);
}
