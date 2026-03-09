import Link from 'next/link';
import { AuthCard } from '@/app/components/AuthCard';
import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthCard
        title="Sign In"
        description="Enter your credentials to continue"
        footer={
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        }
      >
        <SignInForm />
      </AuthCard>
    </div>
  );
}
