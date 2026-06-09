import basicSsl from '@vitejs/plugin-basic-ssl';

export default {
  base: '/project-zero/',
  plugins: [basicSsl()],
  server: { host: true },
};
