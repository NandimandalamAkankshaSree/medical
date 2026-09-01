import React, { useState, useEffect, useRef } from 'react';
import {
  Apple,
  Search,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Utensils,
  RefreshCw,
  HeartPulse,
  Bell,
  BellRing,
  BellOff,
  Clock,
  Volume2,
  Calendar,
  CalendarPlus,
  Download,
  Check,
  Play,
  Droplets,
  Coffee,
  Sun,
  Moon,
  Info,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { PatientProfile, DietPlanResponse, USDAFoodItem, MealItem, FoodPreference } from '../types';

interface DietNutritionViewProps {
  patient: PatientProfile;
}

interface MealReminder {
  id: string;
  name: string;
  category: 'meal' | 'hydration';
  time: string; // "HH:MM" in 24h format
  displayTime: string; // "8:00 AM"
  enabled: boolean;
  mealKey?: string;
  description: string;
  suggestedItems: string[];
  calories?: number;
}

const DEFAULT_REMINDERS: MealReminder[] = [
  {
    id: 'morning_water',
    name: 'Morning Hydration & Detox',
    category: 'hydration',
    time: '07:00',
    displayTime: '7:00 AM',
    enabled: true,
    description: '300ml warm water with lemon or herbal infusion',
    suggestedItems: ['Warm water with pinch of cinnamon', 'Lemon infused water', 'Hydration before breakfast']
  },
  {
    id: 'breakfast',
    name: 'Energizing Breakfast',
    category: 'meal',
    mealKey: 'breakfast',
    time: '08:00',
    displayTime: '8:00 AM',
    enabled: true,
    calories: 380,
    description: 'Steel-cut oats with chia seeds, egg white omelet or tofu scramble',
    suggestedItems: ['Steel-Cut Rolled Oats (Cooked)', 'Boiled Egg Whites (2) OR Organic Tofu', 'Unsweetened Almond Milk', 'Herbal Green Tea']
  },
  {
    id: 'mid_morning',
    name: 'Mid-Morning Metabolic Fuel',
    category: 'meal',
    mealKey: 'mid_morning',
    time: '10:45',
    displayTime: '10:45 AM',
    enabled: true,
    calories: 140,
    description: 'Handful of raw almonds, soaked walnuts, or low-GI berries',
    suggestedItems: ['Raw California Almonds (10-12)', 'Soaked Walnuts (3-4 halves)', 'Fresh Blueberries or Apple Slices']
  },
  {
    id: 'lunch',
    name: 'Balanced Clinical Lunch',
    category: 'meal',
    mealKey: 'lunch',
    time: '13:15',
    displayTime: '1:15 PM',
    enabled: true,
    calories: 520,
    description: '50% non-starchy vegetables, 25% lean protein, 25% whole grains',
    suggestedItems: ['Steamed Broccoli, Spinach & Bell Peppers', 'Grilled Skinless Chicken OR Organic Paneer (120g)', 'Cooked Brown Basmati Rice or Quinoa', 'Yellow Moong Dal / Lentil Broth']
  },
  {
    id: 'afternoon_water',
    name: 'Afternoon Hydration Boost',
    category: 'hydration',
    time: '14:30',
    displayTime: '2:30 PM',
    enabled: true,
    description: '250ml plain water or cucumber infused detox water',
    suggestedItems: ['250ml Clean Water', 'Electrolyte check', 'Avoid sugary sodas/beverages']
  },
  {
    id: 'evening_snack',
    name: 'Evening Nourishment',
    category: 'meal',
    mealKey: 'evening_snack',
    time: '16:45',
    displayTime: '4:45 PM',
    enabled: true,
    calories: 160,
    description: 'Plain Greek yogurt with flaxseeds or roasted makhana (fox nuts)',
    suggestedItems: ['Low-fat Plain Greek Yogurt (100g)', 'Roasted Fox Nuts (Makhana)', 'Warm Tulsi Ginger Infusion']
  },
  {
    id: 'dinner',
    name: 'Light Restorative Dinner',
    category: 'meal',
    mealKey: 'dinner',
    time: '19:30',
    displayTime: '7:30 PM',
    enabled: true,
    calories: 410,
    description: 'Low-glycemic meal: Baked salmon or stir-fried cottage cheese with mixed salad',
    suggestedItems: ['Wild Baked Salmon OR Stir-fried Tofu with Veggies', 'Large Green Leafy Salad with Olive Oil Dressing', 'Warm Clear Vegetable Broth']
  },
  {
    id: 'night_hydration',
    name: 'Pre-Bedtime Relaxation Infusion',
    category: 'hydration',
    time: '21:15',
    displayTime: '9:15 PM',
    enabled: true,
    description: 'Warm chamomile tea or 150ml warm water for restful digestion',
    suggestedItems: ['Chamomile or Peppermint Herbal Tea', '150ml Warm Water', 'Support overnight glycemic homeostasis']
  }
];

export const DietNutritionView: React.FC<DietNutritionViewProps> = ({ patient }) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'reminders' | 'foods' | 'niddk'>('plan');
  const [dietPlan, setDietPlan] = useState<DietPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string>(
    patient.medical_conditions || 'Type 2 Diabetes Mellitus / Prediabetes'
  );
  const [customCondition, setCustomCondition] = useState('');

  // Reminders State (loaded from localStorage with fallback to DEFAULT_REMINDERS)
  const [reminders, setReminders] = useState<MealReminder[]>(() => {
    const saved = localStorage.getItem(`mediassist_diet_reminders_${patient.patient_id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_REMINDERS;
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const [activeAlert, setActiveAlert] = useState<{ title: string; body: string; time: string } | null>(null);
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);
  const [icsDownloaded, setIcsDownloaded] = useState(false);

  // USDA Foods Search State
  const [foodQuery, setFoodQuery] = useState('');
  const [foodCategory, setFoodCategory] = useState('All');
  const [foods, setFoods] = useState<USDAFoodItem[]>([]);

  // NIDDK Guidelines State
  const [niddkCondition, setNiddkCondition] = useState('Diabetes');
  const [niddkGuidelines, setNiddkGuidelines] = useState<any[]>([]);

  const foodCategories = [
    'All', 'Whole Grains', 'Vegetables', 'Fruits', 'Lean Poultry',
    'Fish & Seafood', 'Legumes', 'Plant Protein', 'Dairy', 'Nuts & Seeds'
  ];
  const niddkConditions = ['Diabetes', 'Kidney Disease', 'Hypertension / DASH', 'Hyperlipidemia', 'Healthy Eating'];

  // Save reminders to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem(`mediassist_diet_reminders_${patient.patient_id}`, JSON.stringify(reminders));
  }, [reminders, patient.patient_id]);

  // Gentle Two-Tone Web Audio Chime (No external audio file required)
  const playReminderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      // Tone 1: 523.25 Hz (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tone 2: 659.25 Hz (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.18);
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);

      setTestSoundPlaying(true);
      setTimeout(() => setTestSoundPlaying(false), 800);
    } catch (e) {
      console.warn('Audio Context not available:', e);
    }
  };

  // Request Web Notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      return perm;
    }
    return 'denied';
  };

  // Trigger a reminder notification
  const triggerNotification = (reminder: MealReminder) => {
    playReminderChime();
    setActiveAlert({
      title: `⏰ MediAssist AI: ${reminder.name} (${reminder.displayTime})`,
      body: reminder.description,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🥗 Time for ${reminder.name}!`, {
        body: `${reminder.description}\nRecommended: ${reminder.suggestedItems.slice(0, 2).join(', ')}`,
        icon: '/favicon.ico'
      });
    }

    setTimeout(() => {
      setActiveAlert(null);
    }, 9000);
  };

  // Live Timer Interval checking reminder triggers
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentSeconds = now.getSeconds();

      // Trigger precisely at the start of the minute (:00-:03)
      if (currentSeconds <= 2) {
        reminders.forEach((r) => {
          if (r.enabled && r.time === currentTimeStr) {
            triggerNotification(r);
          }
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reminders]);

  // Load Diet Plan for patient & selected condition
  const loadPlanForCondition = async (conditionStr: string) => {
    setLoading(true);
    try {
      const plan = await api.generateDietPlan(patient.patient_id, undefined, conditionStr);
      setDietPlan(plan);
      setSelectedCondition(conditionStr);
    } catch (err) {
      console.error('Failed to load diet plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanForCondition(patient.medical_conditions || 'Type 2 Diabetes Mellitus / Prediabetes');
  }, [patient.patient_id, patient.medical_conditions]);

  // Load USDA Foods
  useEffect(() => {
    const loadFoods = async () => {
      try {
        const cat = foodCategory === 'All' ? '' : foodCategory;
        const data = await api.searchFoods(foodQuery, cat);
        setFoods(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadFoods();
  }, [foodQuery, foodCategory]);

  // Load NIDDK Guidelines
  useEffect(() => {
    const loadNIDDK = async () => {
      try {
        const data = await api.getNIDDKGuidelines(niddkCondition);
        setNiddkGuidelines(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadNIDDK();
  }, [niddkCondition]);

  const handleCustomConditionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCondition.trim()) {
      loadPlanForCondition(customCondition.trim());
      setCustomCondition('');
    }
  };

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const updateReminderTime = (id: string, newTime: string) => {
    const [h, m] = newTime.split(':');
    const hourNum = parseInt(h);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const displayStr = `${displayHour}:${m} ${ampm}`;

    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, time: newTime, displayTime: displayStr } : r))
    );
  };

  const toggleAllReminders = (enable: boolean) => {
    if (enable && notificationPermission !== 'granted') {
      requestNotificationPermission();
    }
    setReminders((prev) => prev.map((r) => ({ ...r, enabled: enable })));
  };

  // Export recurring reminders to ICS calendar file (Google / Apple Calendar)
  const exportToCalendarICS = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MediAssist AI//Diet Reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    reminders.filter((r) => r.enabled).forEach((r) => {
      const [hour, min] = r.time.split(':');
      const dtStart = `${y}${m}${d}T${hour}${min}00`;
      const endHour = String((parseInt(hour) + 1) % 24).padStart(2, '0');
      const dtEnd = `${y}${m}${d}T${endHour}${min}00`;

      icsContent.push(
        'BEGIN:VEVENT',
        `SUMMARY:🥗 MediAssist AI: ${r.name}`,
        `DESCRIPTION:${r.description}\\nItems: ${r.suggestedItems.join(', ')}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        'RRULE:FREQ=DAILY',
        'BEGIN:VALARM',
        'TRIGGER:-PT5M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: Time for ${r.name}`,
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mediassist_diet_reminders_${patient.patient_id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIcsDownloaded(true);
    setTimeout(() => setIcsDownloaded(false), 3000);
  };

  const activeRemindersCount = reminders.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      
      {/* In-App Live Pop-Up Alert Banner (When a reminder triggers) */}
      {activeAlert && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-3xl bg-slate-900 text-white border-2 border-teal-500 shadow-2xl animate-fade-in flex items-start gap-3 max-w-md">
          <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold shrink-0 animate-bounce">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-xs text-teal-300">{activeAlert.title}</h4>
              <span className="text-[10px] text-slate-400">{activeAlert.time}</span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">{activeAlert.body}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Personalized Clinical Diet & Nutrition
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  NIDDK / NIH Grounded
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Evidence-based 5-meal schedule, automated meal reminders, and macronutrient targets for <strong>{patient.full_name}</strong>.
              </p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'plan'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
            >
              5-Meal Plan
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reminders'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Reminders ({activeRemindersCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('foods')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'foods'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
            >
              USDA Foods
            </button>
            <button
              onClick={() => setActiveTab('niddk')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'niddk'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
            >
              NIDDK Guidelines
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REMINDERS BANNER / STRIP (Visible on Plan & Reminders Tabs) */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-500/20 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Automated Meal & Hydration Reminders</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {activeRemindersCount} of {reminders.length} Alarms Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Scheduled alerts for Breakfast (8:00 AM), Mid-Morning (10:45 AM), Lunch (1:15 PM), Hydration, Evening Snack (4:45 PM), and Dinner (7:30 PM).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reminders')}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Bell className="w-3.5 h-3.5 text-teal-600" />
            <span>Configure Reminders</span>
          </button>

          <button
            onClick={() => playReminderChime()}
            title="Test reminder chime sound"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Volume2 className={`w-3.5 h-3.5 ${testSoundPlaying ? 'text-emerald-500 animate-pulse' : ''}`} />
          </button>

          <button
            onClick={exportToCalendarICS}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {icsDownloaded ? <Check className="w-3.5 h-3.5" /> : <CalendarPlus className="w-3.5 h-3.5" />}
            <span>{icsDownloaded ? 'Exported!' : 'Sync to Calendar (.ics)'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 5-MEAL SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400 animate-pulse bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 mx-auto text-teal-600 animate-spin mb-2" />
              Computing metabolic caloric targets and retrieving NIDDK guidelines for {selectedCondition}...
            </div>
          ) : !dietPlan ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border">
              <p className="text-xs text-slate-500">Unable to generate diet plan.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Macro Targets Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold">{dietPlan.title}</h2>
                    <p className="text-xs text-emerald-100">
                      Condition Target: <strong>{dietPlan.condition_context}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-3.5 py-1 rounded-full flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Target: {dietPlan.daily_targets.calories.toFixed(0)} kcal/day
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Protein Target:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.protein_g} g</p>
                    <span className="text-[10px] text-emerald-200/80">Lean Muscle Maintenance</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Carbohydrate Target:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.carbs_g} g</p>
                    <span className="text-[10px] text-emerald-200/80">Low-Glycemic Load</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Healthy Fats Target:</span>
                    <p className="text-lg font-bold">{dietPlan.daily_targets.fat_g} g</p>
                    <span className="text-[10px] text-emerald-200/80">MUFA / PUFA Rich</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md">
                    <span className="text-emerald-200">Daily Sodium Limit:</span>
                    <p className="text-lg font-bold">&lt; {dietPlan.daily_targets.sodium_limit_mg} mg</p>
                    <span className="text-[10px] text-emerald-200/80">DASH Sodium Cap</span>
                  </div>
                </div>
              </div>

              {/* 5-Meal Schedule Grid with Interactive Reminders Integrated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(dietPlan.meal_schedule).map(([key, mealObj]) => {
                  const meal = mealObj as MealItem;
                  const matchingReminder = reminders.find((r) => r.mealKey === key || r.id === key);

                  return (
                    <div
                      key={key}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Meal Header */}
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-teal-600" />
                            <span>{meal.meal_name}</span>
                          </span>
                          <span className="text-teal-600 font-semibold bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                            {meal.calories} kcal
                          </span>
                        </div>

                        {/* Reminder Time Strip */}
                        {matchingReminder && (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                              <Bell className={`w-3.5 h-3.5 ${matchingReminder.enabled ? 'text-teal-600' : 'text-slate-400'}`} />
                              <span>Reminder: <strong>{matchingReminder.displayTime}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => triggerNotification(matchingReminder)}
                                title="Test Alarm"
                                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-teal-100 cursor-pointer"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => toggleReminder(matchingReminder.id)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                  matchingReminder.enabled
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                }`}
                              >
                                {matchingReminder.enabled ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Meal Items */}
                        <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px] pt-3">
                          {meal.items.map((it: string, iIdx: number) => (
                            <li key={iIdx} className="leading-relaxed">
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-teal-700 dark:text-teal-300 italic flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{meal.clinical_notes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Foods to Prefer & Avoid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Recommended Foods to Prefer</span>
                  </h4>
                  <div className="space-y-2 text-[11px]">
                    {dietPlan.foods_to_prefer.map((fp: FoodPreference, i: number) => (
                      <div key={i} className="text-slate-700 dark:text-slate-300">
                        <strong>• {fp.food}:</strong> {fp.rationale}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                  <h4 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Foods to Strictly Limit / Avoid</span>
                  </h4>
                  <div className="space-y-2 text-[11px]">
                    {dietPlan.foods_to_avoid.map((fa: FoodPreference, i: number) => (
                      <div key={i} className="text-slate-700 dark:text-slate-300">
                        <strong>• {fa.food}:</strong> {fa.rationale}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED MEAL & HYDRATION REMINDERS MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          
          {/* Reminders Controls Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-600" />
                <span>Daily Meal & Hydration Reminder Schedule</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set and customize automated browser notifications and audio alarms aligned with your clinical 5-meal schedule.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAllReminders(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 font-semibold text-xs cursor-pointer"
              >
                Enable All
              </button>
              <button
                onClick={() => toggleAllReminders(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs cursor-pointer"
              >
                Disable All
              </button>
              <button
                onClick={exportToCalendarICS}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {icsDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>Sync to Phone / Calendar</span>
              </button>
            </div>
          </div>

          {/* Reminders List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((reminder) => {
              const isHydration = reminder.category === 'hydration';
              return (
                <div
                  key={reminder.id}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-3 flex flex-col justify-between ${
                    reminder.enabled
                      ? 'border-teal-500/50 shadow-md shadow-teal-500/5'
                      : 'border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                            isHydration
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400'
                          }`}
                        >
                          {isHydration ? <Droplets className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {isHydration ? 'Hydration Target' : 'Meal Time'}
                            </span>
                            {reminder.calories && (
                              <span className="text-[10px] text-teal-600 font-bold">
                                • {reminder.calories} kcal
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {reminder.name}
                          </h3>
                        </div>
                      </div>

                      {/* Time Input & Toggle */}
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={reminder.time}
                          onChange={(e) => updateReminderTime(reminder.id, e.target.value)}
                          className="px-2 py-1 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        />
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                            reminder.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {reminder.enabled ? 'Active' : 'Off'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                      {reminder.description}
                    </p>

                    {/* Suggested items list */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                        Recommended Items:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
                        {reminder.suggestedItems.map((it, idx) => (
                          <li key={idx} className="truncate">{it}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions: Test Alarm */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Scheduled Daily at <strong>{reminder.displayTime}</strong>
                    </span>

                    <button
                      onClick={() => triggerNotification(reminder)}
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Play className="w-3 h-3 text-teal-600" />
                      <span>Test Reminder</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USDA FOODS */}
      {/* ========================================================================= */}
      {activeTab === 'foods' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Search className="w-4 h-4 text-teal-600" />
                  <span>USDA FoodData Central Database</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search nutrition, calories, and glycemic index for standard whole foods and ingredients.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  placeholder="Search oats, spinach, salmon..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {foodCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFoodCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    foodCategory === cat
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Foods Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food) => (
              <div
                key={food.food_id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {food.food_category}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                      {food.food_name}
                    </h3>
                  </div>
                  <span className="text-teal-600 font-bold bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full text-[10px]">
                    {food.calories} kcal / {food.serving_size}{food.serving_unit}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[10px]">
                  <div>
                    <span className="text-slate-400">Protein</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{food.protein_g}g</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Carbs</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{food.carbohydrates_g}g</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fats</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{food.fat_g}g</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 {food.suitability_notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NIDDK GUIDELINES */}
      {/* ========================================================================= */}
      {activeTab === 'niddk' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span>NIDDK / NIH Clinical Dietary Guidelines</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official clinical nutrition modules from the National Institute of Diabetes and Digestive and Kidney Diseases.
                </p>
              </div>

              {/* Condition Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Condition:</span>
                <select
                  value={niddkCondition}
                  onChange={(e) => setNiddkCondition(e.target.value)}
                  className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {niddkConditions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {niddkGuidelines.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                      {item.id} • {item.source}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <ul className="list-disc list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {item.guidelines.map((g: string, gIdx: number) => (
                    <li key={gIdx}>{g}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
