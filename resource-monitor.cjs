// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE MONITOR - Hard caps para RAM y CPU
// Previene memory leaks y uso excesivo de recursos
// ═══════════════════════════════════════════════════════════════════════════

const { app } = require('electron')

// LÍMITES CONFIGURABLES
const MAX_MEMORY_MB = 250  // Hard cap: 250 MB
const MAX_CPU_PERCENT = 10 // Hard cap: 10% CPU promedio
const TARGET_CPU_PERCENT = 5 // Objetivo: 5% CPU promedio
const CHECK_INTERVAL_MS = 10000 // Revisar cada 10 segundos
const CPU_SAMPLE_COUNT = 6 // Muestras para promedio de CPU

class ResourceMonitor {
    constructor(mainWindow, serverProc) {
        this.mainWindow = mainWindow
        this.serverProc = serverProc
        this.cpuSamples = []
        this.monitorInterval = null
        this.lastCpuUsage = null
    }

    start() {
        console.log('[ResourceMonitor] Iniciado - Límites: RAM=' + MAX_MEMORY_MB + 'MB, CPU=' + MAX_CPU_PERCENT + '%')
        
        this.monitorInterval = setInterval(() => {
            this.checkResources()
        }, CHECK_INTERVAL_MS)
    }

    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval)
            this.monitorInterval = null
        }
    }

    checkResources() {
        try {
            // 1. Revisar memoria del proceso principal (RSS = Resident Set Size)
            const memInfo = process.memoryUsage()
            const heapUsedMB = Math.round(memInfo.heapUsed / 1024 / 1024)
            const rssMB = Math.round(memInfo.rss / 1024 / 1024)
            const totalMemoryMB = rssMB

            // HARD CAP: Si se excede el límite de memoria
            if (totalMemoryMB > MAX_MEMORY_MB) {
                console.warn(`[ResourceMonitor] ⚠️ LÍMITE DE MEMORIA EXCEDIDO: ${totalMemoryMB}MB / ${MAX_MEMORY_MB}MB`)
                this.handleMemoryOverflow()
            }

            // Log cada minuto (6 checks)
            if (Math.random() < 0.16) {
                console.log(`[ResourceMonitor] RAM: ${totalMemoryMB}MB (Heap: ${heapUsedMB}MB)`)
            }

            // 3. Revisar CPU
            const cpuUsage = process.cpuUsage(this.lastCpuUsage)
            this.lastCpuUsage = process.cpuUsage()
            
            // Calcular porcentaje de CPU (user + system)
            const totalCpuMicros = cpuUsage.user + cpuUsage.system
            const elapsedSeconds = CHECK_INTERVAL_MS / 1000
            const cpuPercent = Math.round((totalCpuMicros / 1000000 / elapsedSeconds) * 100)

            this.cpuSamples.push(cpuPercent)
            if (this.cpuSamples.length > CPU_SAMPLE_COUNT) {
                this.cpuSamples.shift()
            }

            // Calcular promedio de CPU
            const avgCpu = Math.round(this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length)

            // Advertencia si supera el objetivo
            if (avgCpu > TARGET_CPU_PERCENT && this.cpuSamples.length >= CPU_SAMPLE_COUNT) {
                if (Math.random() < 0.16) {
                    console.log(`[ResourceMonitor] ℹ️ CPU por encima del objetivo: ${avgCpu}% (objetivo: ${TARGET_CPU_PERCENT}%)`)
                }
            }

            // HARD CAP: Si se excede el límite de CPU
            if (avgCpu > MAX_CPU_PERCENT && this.cpuSamples.length >= CPU_SAMPLE_COUNT) {
                console.warn(`[ResourceMonitor] ⚠️ LÍMITE DE CPU EXCEDIDO: ${avgCpu}% / ${MAX_CPU_PERCENT}%`)
                this.handleCpuOverflow()
            }

        } catch (err) {
            console.error('[ResourceMonitor] Error al revisar recursos:', err.message)
        }
    }

    handleMemoryOverflow() {
        // Estrategia de mitigación de memoria
        console.log('[ResourceMonitor] 🔧 Aplicando mitigación de memoria...')

        // 1. Forzar garbage collection si está disponible
        if (global.gc) {
            global.gc()
            console.log('[ResourceMonitor] ✓ Garbage collection ejecutado')
        }

        // 2. Limpiar caché del renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.session.clearCache()
                .then(() => console.log('[ResourceMonitor] ✓ Caché del renderer limpiado'))
                .catch(() => {})
        }

        // 3. Notificar al renderer para que limpie
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('memory-warning', {
                action: 'cleanup',
                message: 'Límite de memoria alcanzado, limpiando recursos...'
            })
        }

        // 4. Si persiste después de 30s, reiniciar servidor
        setTimeout(() => {
            const memInfo = process.memoryUsage()
            const rssMB = Math.round(memInfo.rss / 1024 / 1024)
            if (rssMB > MAX_MEMORY_MB * 0.9) {
                console.warn('[ResourceMonitor] ⚠️ Memoria aún alta, reiniciando servidor...')
                this.restartServer()
            }
        }, 30000)
    }

    handleCpuOverflow() {
        // Estrategia de mitigación de CPU
        console.log('[ResourceMonitor] 🔧 Aplicando mitigación de CPU...')

        // Notificar al renderer para que reduzca actividad
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('cpu-warning', {
                action: 'throttle',
                message: 'Uso de CPU alto, reduciendo actividad...'
            })
        }

        // Reducir prioridad del proceso temporalmente
        try {
            const os = require('os')
            if (os.platform() === 'win32') {
                // En Windows, reducir prioridad
                const { exec } = require('child_process')
                exec(`wmic process where processid="${process.pid}" CALL setpriority "below normal"`, () => {})
            }
        } catch (err) {
            console.error('[ResourceMonitor] Error al ajustar prioridad:', err.message)
        }
    }

    restartServer() {
        if (this.serverProc && !this.serverProc.killed) {
            console.log('[ResourceMonitor] Reiniciando servidor por alto uso de memoria...')
            try {
                this.serverProc.kill('SIGTERM')
            } catch (err) {
                console.error('[ResourceMonitor] Error al reiniciar servidor:', err.message)
            }
        }
    }
}

module.exports = ResourceMonitor
