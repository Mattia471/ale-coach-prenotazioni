import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Bell, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, CreditCard, Dumbbell, ExternalLink, Gift, Instagram, LockKeyhole, LogOut, MapPin, Menu, MessageCircle, QrCode, Settings2, ShieldCheck, Sparkles, Tag, TicketPercent, UserRound, Users, Wallet, X, Zap } from 'lucide-react';
import type { Booking, ClientTab, CoachTab, Discount, Notice, Pack, PaymentMode, Profile, Service, Venue, Wallet as CreditWallet, WorkingHours } from './types';
import { currency, dateLabel, demoBooking, demoHours, demoPacks, demoServices, demoVenues, nextDates, previewProfile, ready, sources, stateLabels, supabase, timeLabel, whatsappLink } from './lib';

type Screen='landing'|'auth'|'client'|'coach';
type Step='details'|'when'|'review';
const disciplines=['Forza / Sala pesi','TRX','GRID','Calisthenics','Hyrox','Flexability','Cross Active'];
const dayNames=['Luned√¨','Marted√¨','Mercoled√¨','Gioved√¨','Venerd√¨','Sabato','Domenica'];
const iconByService:Record<string,typeof Zap>={single:Zap,couple:Users,check:CalendarCheck,start:Dumbbell,intro:MessageCircle,other:Sparkles};
const promo='ALECOACH10';
const fromUrl=()=>{const q=new URLSearchParams(location.search);return {source:q.get('source')||'direct',code:(q.get('code')||'').toUpperCase(),referral:q.get('ref')||''};};
const storage∂ªßq´^