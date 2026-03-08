import Link from 'next/link';
import { AuthCard } from '@/app/components/AuthCard';
import { SignUpForm } from './SignUpForm';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthCard
        title="Sign Up"
        description="Create an account to get started"
        footer={
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <SignUpForm />
      </AuthCard>
    </div>
  );
}
