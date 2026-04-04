export type OperationResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
    }

export const operationSuccess = <T>(data: T): OperationResult<T> => ({
  ok: true,
  data,
})

export const operationFailure = <T = never>(error: string): OperationResult<T> => ({
  ok: false,
  error,
})
