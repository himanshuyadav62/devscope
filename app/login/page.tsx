import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f3] px-4 text-[#1c211f] dark:bg-[#101513] dark:text-[#edf1ee]">
      <div>
        <LoginForm next={params.next} />
        {params.error ? (
          <p className="mt-4 text-center text-xs text-red-700">
            Google sign-in could not be completed. Please try again.
          </p>
        ) : null}
      </div>
    </main>
  );
}
