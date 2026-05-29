type UsernameLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernameLayout({
  children,
}: UsernameLayoutProps) {
  return children;
}
