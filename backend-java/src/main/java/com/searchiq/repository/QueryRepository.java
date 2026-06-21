package com.searchiq.repository;

import com.searchiq.model.Query;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.regex.Pattern;

/**
 * QueryRepository — Spring Data MongoDB repository.
 *
 * Spring Data automatically generates the implementation at startup.
 * We only need to declare method signatures — Spring derives the MongoDB
 * query from the method name.
 *
 * Custom methods used:
 * - findByQueryRegexOrderByCountDesc: prefix search (regex ^iph)
 *   → MongoDB: db.queries.find({ query: /^iph/i }).sort({ count: -1 }).limit(50)
 *
 * - findAllByOrderByCountDesc: top-N by count for trending candidates
 *   → MongoDB: db.queries.find({}).sort({ count: -1 }).limit(200)
 */
@Repository
public interface QueryRepository extends MongoRepository<Query, String> {

    /**
     * Find queries matching a prefix regex, sorted by count descending.
     * @param regex  compiled regex like Pattern.compile("^iph", CASE_INSENSITIVE)
     * @param limit  we use Pageable in service instead — Spring resolves
     */
    List<Query> findByQueryRegexOrderByCountDesc(Pattern regex);

    /**
     * Fetch top N queries by count — used as trending candidates.
     */
    List<Query> findTop200ByOrderByCountDesc();
}
