package com.mailmind.gmail.repository;

import com.mailmind.gmail.model.AiResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AiResultRepository extends JpaRepository<AiResult, String> {
    Optional<AiResult> findTopByEmailIdAndTypeOrderByCreatedAtDesc(String emailId, AiResult.ResultType type);
}
