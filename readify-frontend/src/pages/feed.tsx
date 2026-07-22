export default function Feed() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-text">Your feed is warming up</h1>
        <p className="mt-2 text-sm text-textSecondary">
          We're lining up recommendations based on what you just told us. Check back soon.
        </p>
      </div>
    </div>
  );
}