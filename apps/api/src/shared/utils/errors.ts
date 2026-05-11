export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function criarErro(statusCode: number, mensagem: string): AppError {
  return new AppError(statusCode, mensagem)
}
