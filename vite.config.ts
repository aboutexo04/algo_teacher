import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 현재 작업 디렉토리에서 환경 변수 로드 (.env 파일 등)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // 코드 내의 process.env.API_KEY를 실제 환경 변수 값으로 치환
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});