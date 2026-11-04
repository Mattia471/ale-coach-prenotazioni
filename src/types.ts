export type Role = 'client' | 'coach';
export type BookingStatus = 'authorizing'|'processing'|'pending'|'awaiting_payment'|'confirmed'|'quoted'|'rejected'|'cancelled'|'expired';
export type PaymentMode = 'online'|'in_person'|'credit'|'none';
export interface Profile { id:string; email:string; role:Role; full_name:string; phone:string; virgin_member:boolean; allow_in_person:boolean; first_contact_at:string; created_at:string }
export interface Service { id:string;name:string;description:string;kind:'paid'|'free'|'quote';duration_minutes:number;price_cents:number;active:boolean;sort_order:number }
export interface Venue {id:string;name:string;subtitle:string}
export interface WorkingHours {weekday:number;is_open:boolean;start_hour:number;end_hour:number}
export interface Pack {id:string;name:string;type:'pack'|'subscription';credits:number;price_cents:number;validity_days:number;description:string;active:boolean;sort_order:number}
export interface Booking {id:string;client_id:string;service_id:string;venue_id:string|null;starts_at:string|null;duration_minutes:number;status:BookingStatus;payment_mode:PaymentMode;payment_status:'unpaid'|'awaiting'|'authorized'|'paid'|'due_in_person'|'refunded';base_amount_cents:number;amount_cents:number;discount_percent:number;promo_code:string|null;details:Record<string,string>;source:string;referral:string|null;created_at:string;expires_at:string;approved_at:string|null;paid_at:string|null;cancelled_at:string|null;credit_wallet_id:string|null;stripe_checkout_session_id:string|null;stripe_payment_intent_id:string|null;stripe_decision:'approve'|'reject'|'cancel'|null;stripe_authorized_at:string|null;stripe_authorization_expires_at:string|null}
export interface Notice{id:string;recipient_id:string;title:string;body:string;kind:string;booking_id:string|null;read_at:string|null;created_at:string}
export interface Wallet{id:string;client_id:string;package_id:string;remaining:number;expires_at:string}
export interface Discount {code:string;percent_off:number;active:boolean;first_purchase_only:boolean;valid_days_from_contact:number|null;uses:number}
export type CoachTab='overview'|'requests'|'agenda'|'clients'|'hours'|'services'|'marketing';
export type ClientTab='home'|'bookings'|'messages'|'profile';
