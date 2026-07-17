package com.tad.dooh.driver.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tad.dooh.driver.data.local.*
import com.tad.dooh.driver.data.remote.*
import com.tad.dooh.driver.service.TelemetryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
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
 * which [androidx.hilt.navigation.compose.hiltViewModel] wires into any
 * `@Composable`. All 4 deps are resolved from the Hilt graph:
 *  - [TadApiService]            → [com.tad.dooh.driver.di.NetworkModule]
 *  - [HubCacheDao]              → [com.tad.dooh.driver.di.DatabaseModule]
 *  - [AuthDao]                  → [com.tad.dooh.driver.di.DatabaseModule]
 *  - [TelemetryRepository]      → [com.tad.dooh.driver.di.RepositoryModule]
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
                    val parsed = normalizeHubDataFromJson(cached)
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
            ) { status, batch, offline, tracking ->
                _uiState.update {
                    it.copy(
                        connectionStatus = status,
                        batchCount = batch,
                        offlineCount = offline,
                        isTracking = tracking,
                    )
                }
            }.collect()
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
                val normalized = DriverHubData.normalize(response)
                _uiState.update {
                    it.copy(hubData = normalized, isLoading = false, isLocalMode = false, error = null)
                }
                // Cache to Room
                hubCacheDao.save("TAD_DRIVER_HUB_CACHE", serializeHubData(normalized))
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message, isLoading = false) }
                // Circuit breaker: fallback to cache
                val cached = hubCacheDao.read("TAD_DRIVER_HUB_CACHE")
                if (cached != null) {
                    try {
                        _uiState.update {
                            it.copy(hubData = normalizeHubDataFromJson(cached), isLocalMode = true)
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
        private fun serializeHubData(data: DriverHubData): String {
            // kotlinx.serialization or manual JSON — placeholder
            return "{}" // TODO: implement with kotlinx.serialization
        }

        private fun normalizeHubDataFromJson(json: String): DriverHubData {
            // TODO: implement with kotlinx.serialization
            return DriverHubData.default()
        }
    }
}
