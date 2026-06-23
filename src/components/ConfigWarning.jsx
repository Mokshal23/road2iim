export default function ConfigWarning() {
  return (
    <div className="card config-warning">
      <h3>Firebase isn't connected yet</h3>
      <p>
        This app needs Firebase credentials to store and sync data. Add them as environment
        variables (see <code>.env.example</code> in the project, or your Vercel project settings),
        then reload.
      </p>
      <p className="empty">Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID</p>
    </div>
  );
}
