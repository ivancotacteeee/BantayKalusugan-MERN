import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm, FormProvider } from "react-hook-form";
import { HeartPulse, Heart, Gauge, Weight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegisterFields } from "./register-field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { database, ref, onValue } from '@/lib/firebase';

export function RegisterForm({ className, ...props }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isUserId, setIsUserId] = useState(null);
  const [isBeating, setIsBeating] = useState(true);
  const [healthData, setHealthData] = useState({ heartRate: null, SpO2: null, weight: null });
  const [measurementStatus] = useState({
    heartRate: "Place your finger on the sensor",
    SpO2: "Keep your finger steady on the sensor",
    weight: "Step onto the scale and stand still"
  });
  const [isMeasuring] = useState({ heartRate: false, SpO2: false, weight: false });
  const [submissionState, setSubmissionState] = useState({ loading: false, success: false, error: false });
  const methods = useForm();

  useEffect(() => {
    document.title = 'HMS - Health Monitoring System';
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setIsBeating(prev => !prev), 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const allDataPresent = healthData.heartRate !== null && healthData.SpO2 !== null && healthData.weight !== null;

    if (allDataPresent && !submissionState.success && !submissionState.loading) {
      handleAutoSubmit(healthData);
    }
  }, [healthData]);

  useEffect(() => {
    let firstVitals = true;
    let firstWeight = true;

    const vitalsRef = ref(database, 'healthData/vitals');
    const unsubscribeVitals = onValue(vitalsRef, (snapshot) => {
      if (firstVitals) {
        firstVitals = false;
        return;
      }
      const data = snapshot.val();
      setHealthData(prev => ({ ...prev, ...data }));
    });

    const weightRef = ref(database, 'healthData/weight');
    const unsubscribeWeight = onValue(weightRef, (snapshot) => {
      if (firstWeight) {
        firstWeight = false;
        return;
      }
      const data = snapshot.val();
      setHealthData(prev => ({ ...prev, weight: data.weight }));
    });

    return () => {
      unsubscribeVitals();
      unsubscribeWeight();
    };
  }, []);

  const onSubmit = async (data) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (responseData.success) {
        setIsUserId(responseData.data.userId);
        setIsSubmitted(true);
      } else {
        setSubmissionState({ loading: false, success: false, error: true });
      }
    } catch {
      setSubmissionState({ loading: false, success: false, error: true });
    }
  };

  const handleAutoSubmit = async (data) => {
    try {
      setSubmissionState({ loading: true, success: false, error: false });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/users/${isUserId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          heartRate: data.heartRate,
          SpO2: data.SpO2,
          weight: data.weight,
        }),
      });
      const responseData = await response.json();
      if (responseData.success === true) {
        setHealthData({ heartRate: null, SpO2: null, weight: null });
        setSubmissionState({ loading: false, success: true, error: false });
      } else {
        setSubmissionState({ loading: false, success: false, error: true });
        console.error("Submission failed:", responseData.message);
      }
    } catch {
      setSubmissionState({ loading: false, success: false, error: true });
    }
  };

  const resetForm = () => {
    setSubmissionState({ loading: false, success: false, error: false });
    setHealthData({ heartRate: null, SpO2: null, weight: null });
    setIsSubmitted(false);
    methods.reset();
  };

  const MetricDisplay = ({ label, icon, value, unit, isMeasuring, status }) => (
    <div className="form-item">
      <div className="flex items-center gap-2 mb-2">{icon}<label className="text-sm font-medium">{label}</label></div>
      <motion.div
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg relative overflow-hidden"
        animate={{ backgroundColor: isMeasuring ? "rgba(243, 244, 246, 0.8)" : "rgba(243, 244, 246, 1)" }}
      >
        <span className={cn("font-mono text-lg", !value && "text-gray-400")}>
          {value !== null && value !== undefined ? value : "--"}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
        {isMeasuring && (
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
        )}
      </motion.div>
      <p className="text-xs text-gray-500 mt-1">{status}</p>
    </div>
  );

  if (isSubmitted) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="bg-primary/10 p-3 rounded-full">
            <motion.div animate={{ scale: isBeating ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
              <HeartPulse className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Health Monitoring System</h1>
            <p className="text-muted-foreground mt-1">Recording your health metrics</p>
          </div>
        </div>

        <Dialog open={submissionState.success} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <DialogTitle className="text-center mt-4">Health Data Submitted!</DialogTitle>
              <DialogDescription className="text-center">
                Your health metrics have been successfully recorded.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button className="w-full max-w-xs" onClick={resetForm}>
                Register Another User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={submissionState.loading} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <DialogTitle className="text-center mt-4">Submitting Health Data</DialogTitle>
              <DialogDescription className="text-center">
                Please wait while we save your health metrics...
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog open={submissionState.error} onOpenChange={() => setSubmissionState(prev => ({ ...prev, error: false }))}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <DialogTitle className="text-center mt-4">Submission Failed</DialogTitle>
              <DialogDescription className="text-center">
                There was an error saving your health data. Please try again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button variant="outline" className="w-full max-w-xs mr-2" onClick={() => setSubmissionState(prev => ({ ...prev, error: false }))}>
                Cancel
              </Button>
              <Button className="w-full max-w-xs" onClick={() => handleAutoSubmit(healthData)}>
                Retry
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-5">
          <MetricDisplay label="Heart Rate (bpm)" icon={<Heart className="h-5 w-5 text-red-500" />} value={healthData.heartRate} unit="bpm" isMeasuring={isMeasuring.heartRate} status={measurementStatus.heartRate} />
          <MetricDisplay label="SpO2 (%)" icon={<Gauge className="h-5 w-5 text-blue-500" />} value={healthData.SpO2} unit="%" isMeasuring={isMeasuring.SpO2} status={measurementStatus.SpO2} />
          <MetricDisplay label="Weight (kg)" icon={<Weight className="h-5 w-5 text-green-500" />} value={healthData.weight} unit="kg" isMeasuring={isMeasuring.weight} status={measurementStatus.weight} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="bg-primary/10 p-3 rounded-full">
          <motion.div animate={{ scale: isBeating ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
            <HeartPulse className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Health Monitoring System</h1>
          <p className="text-muted-foreground mt-1">Create your health profile</p>
        </div>
      </div>
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={methods.handleSubmit(onSubmit)}>
          <RegisterFields />
        </form>
      </FormProvider>
    </div>
  );
}
