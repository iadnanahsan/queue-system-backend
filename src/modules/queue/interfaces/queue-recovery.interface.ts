export interface QueueRecoveryRequest {
    departmentId: string
    lastKnownVersion?: number
}

export interface QueueRecoveryResponse {
    success: boolean
    message?: string
    recoveredEntries?: number
} 