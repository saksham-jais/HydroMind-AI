import React, { useState } from "react";
import { useAuth } from "./auth-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Droplets, Lock, User, Sparkles } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(userid, password);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#faf8f9] flex items-center justify-center">
      {/* Abstract Blush Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url('/login-bg-light.png')` }}
      />
      
      {/* Overlay Gradient for softness */}
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/70 via-transparent to-pink-50/30" />

      {/* Decorative Blob */}
      <div className="absolute top-[-10%] left-[-10%] z-0 h-[40rem] w-[40rem] rounded-full bg-pink-300/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] z-0 h-[40rem] w-[40rem] rounded-full bg-blue-300/20 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 text-blue-600">
            <Droplets className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 drop-shadow-sm">
            Jalrakshak AI
          </h1>
          <p className="mt-3 text-[13px] font-medium uppercase tracking-widest text-slate-500">
            Secure Groundwater Intelligence
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-sm italic text-slate-600/80">
            <Sparkles className="h-4 w-4 text-pink-400" />
            "Water is the driving force of all nature."
            <Sparkles className="h-4 w-4 text-pink-400" />
          </div>
        </div>

        <Card className="border border-white/60 bg-white/40 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                User ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Enter your Govt ID"
                  className="pl-11 bg-white/60 border-white/80 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-400 focus-visible:bg-white h-12 rounded-xl transition-all shadow-sm"
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 bg-white/60 border-white/80 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-400 focus-visible:bg-white h-12 rounded-xl transition-all shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium text-base rounded-xl shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-[10px] text-slate-400 font-medium">
            Protected by Govt. of Gujarat Cyber Cell<br/>
            Unauthorized access is strictly prohibited.
          </div>
        </Card>
      </div>
    </div>
  );
}
