export function AppVersion() {
  return (
    <p className="app-version" title={`Built ${__BUILD_ID__}`}>
      v{__APP_VERSION__} · {__BUILD_ID__}
    </p>
  );
}
