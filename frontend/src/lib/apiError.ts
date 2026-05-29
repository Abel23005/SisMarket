import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Inicia Docker y el backend (puerto 3000).';
  }
  const data = error.response.data as { message?: string | string[] };
  if (Array.isArray(data?.message)) {
    return data.message.join('. ');
  }
  if (typeof data?.message === 'string') {
    return data.message;
  }
  return fallback;
}
