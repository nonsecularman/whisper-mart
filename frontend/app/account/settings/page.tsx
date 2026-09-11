import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="bg-white rounded-xl2 shadow-card p-6">
      <h2 className="font-semibold text-lg text-ink-900 mb-2">Settings</h2>
      <p className="text-sm text-ink-600 mb-4">
        Manage your profile details and password from the{" "}
        <Link href="/account" className="text-whisper-700 font-semibold">Profile</Link> tab.
      </p>
      <p className="text-sm text-ink-600">
        Manage saved addresses from the{" "}
        <Link href="/account/addresses" className="text-whisper-700 font-semibold">Addresses</Link> tab.
      </p>
    </div>
  );
}
