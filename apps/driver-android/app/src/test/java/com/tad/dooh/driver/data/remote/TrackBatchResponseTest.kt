package com.tad.dooh.driver.data.remote

import kotlinx.serialization.json.Json
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrackBatchResponseTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun acknowledgesCompleteAndIdempotentBatches() {
        assertTrue(json.decodeFromString<TrackBatchResponse>(
            """{"count": 50, "input": 50}"""
        ).acknowledges(50))
        assertTrue(json.decodeFromString<TrackBatchResponse>(
            """{"count": 0, "input": 50}"""
        ).acknowledges(50))
        assertTrue(json.decodeFromString<TrackBatchResponse>(
            """{"count": 25, "input": 50}"""
        ).acknowledges(50))
    }

    @Test
    fun rejectsMissingOrInconsistentReceipts() {
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"saved": 50, "skipped": 0}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"count": 50}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"input": 50}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"count": 50, "input": 49}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"count": 51, "input": 50}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"count": -1, "input": 50}"""
        ).acknowledges(50))
        assertFalse(json.decodeFromString<TrackBatchResponse>(
            """{"count": 0, "input": 0}"""
        ).acknowledges(0))
    }
}
