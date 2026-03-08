import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ReactNode } from 'react';

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
