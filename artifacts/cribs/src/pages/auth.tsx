import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";
import { Redirect } from "wouter";

export default function Auth() {
  const { user, signInWithGoogle, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading...</div>;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center">
      <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-3xl font-bold mb-6">
        C
      </div>
      <h1 className="text-3xl font-bold mb-2 text-primary">Cribs</h1>
      <p className="text-muted-foreground mb-12">Real estate as entertainment.</p>
      
      <Button 
        size="lg" 
        className="w-full max-w-sm rounded-full h-14 text-base font-semibold"
        onClick={signInWithGoogle}
        data-testid="button-signin-google"
      >
        <SiGoogle className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>
      
      <p className="text-xs text-muted-foreground mt-8 px-4">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
