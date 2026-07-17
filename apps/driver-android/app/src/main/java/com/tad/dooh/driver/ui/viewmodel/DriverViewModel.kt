package com.tad.dooh.driver.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.HubCacheDao
import com.tad.dooh.driver.data.local.HubCacheEntity
import com.tad.dooh.driver.data.remote.DriverHubData
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.data.remote.normalizeHubData
import com.tad.dooh.driver.service.TelemetryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

data class DashboardUiState(
    val hubData: DriverHubData? = null,
    val isLoading: Boolean = true,
    val isLocalMode: Boolean = false,
    val error: String? = null,
    val connectionStatus: String = "offline",
    val batchCount: Int = 0,
    val offlineCount: Int = 0,
    val isTracking: Boolean = false,
    val isKillSwitchActive: Boolean = false,
)

/**
 * Hilt-injected ViewModel for the driver dashboard / wallet / onboarding flows.
 *
 * `@HiltViewModel` makes this constructible by the generated `HiltViewModelFactory`
 * which `hiltViewModel()` wires into any `@Composable`.
 */
@HiltViewModel
class DriverViewModel @Inject constructor(
    private val apiService: TadApiService,
    private val hubCacheDao: HubCacheDao,
    private val authDao: AuthDao,
    private val telemetryRepo: TelemetryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        // Hydrate from cache first (no flash)
        viewModelScope.launch {
            val cached = hubCacheDao.read("TAD_DRIVER_HUB_CACHE")
            if (cached != null) {
                try {
                    val parsed = normalizeHubDataFromJson(cached.data)
                    _uiState.update { it.copy(hubData = parsed, isLoading = false) }
                } catch (_: Exception) { /* corrupted cache */ }
            }
            fetchHub()
        }

        // Observe telemetry state
        viewModelScope.launch {
            combine(
                telemetryRepo.connectionStatus,
                telemetryRepo.batchCount,
                telemetryRepo.offlineCount,
                telemetryRepo.isTracking,
            ) { isOnline, batch, offline, tracking ->
                _uiState.update {
                    it.copy(
                        connectionStatus = if (isOnline) "online" else "offline",
                        batchCount = batch,
                        offlineCount = offline,
                        isTracking = tracking,
                    )
                }
            }.launchIn(viewModelScope)
        }

        // Observe kill-switch
        viewModelScope.launch {
            _uiState.update { it.copy(isKillSwitchActive = GlobalState.isKillSwitchActive) }
        }
    }

    fun fetchHub() {
        viewModelScope.launch {
            try {
                val response = apiService.getHub()
                val normalized = response
                _uiState.update {
                    it.copy(hubData = normalized, isLoading = false, isLocalMode = false, error = null)
                }
                // Cache to Room
                hubCacheDao.save(
                    HubCacheEntity(
                        key = "TAD_DRIVER_HUB_CACHE",
                        data = serializeHubData(normalized),
                        updatedAt = System.currentTimeMillis()
                    )
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message, isLoading = false) }
                // Circuit breaker: fallback to cache
                val cached = hubCacheDao.read("TAD_DRIVER_HUB_CACHE")
                if (cached != null) {
                    try {
                        _uiState.update {
                            it.copy(hubData = normalizeHubDataFromJson(cached.data), isLocalMode = true)
                        }
                    } catch (_: Exception) { /* corrupted */ }
                }
                val isDnsError = e.message?.uppercase()?.contains("EAI_AGAIN") == true ||
                    e.message?.uppercase()?.contains("ENOTFOUND") == true
                if (cached == null) _uiState.update { it.copy(isLocalMode = isDnsError) }
            }
        }
    }

    fun startTracking() { telemetryRepo.startTracking() }
    fun stopTracking() { telemetryRepo.stopTracking() }
    fun syncPending() { viewModelScope.launch { telemetryRepo.syncPending() } }

    fun logout() {
        viewModelScope.launch {
            telemetryRepo.stopTracking()
            authDao.deleteAll()
            GlobalState.clear()
            _uiState.update { DashboardUiState() }
        }
    }

    companion object {
        private val json = Json { ignoreUnknownKeys = true; isLenient = true }

        private fun serializeHubData(data: DriverHubData): String =
            json.encodeToString(DriverHubData.serializer(), data)

        private fun normalizeHubDataFromJson(json: String): DriverHubData =
            Companion.json.decodeFromString(DriverHubData.serializer(), json)
    }
}
