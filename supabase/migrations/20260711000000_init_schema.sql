-- 1. Create workshops table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create workshop_members table
CREATE TABLE IF NOT EXISTS workshop_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'accountant', 'employee')),
    invited_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (workshop_id, user_id)
);

-- 3. Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_egp NUMERIC NOT NULL,
    duration_days INTEGER NOT NULL
);

-- Populate subscription plans
INSERT INTO subscription_plans (id, name, price_egp, duration_days)
VALUES 
    ('weekly', 'Weekly Plan', 500, 7),
    ('monthly', 'Monthly Plan', 1000, 30),
    ('yearly', 'Yearly Plan', 9500, 365)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_egp = EXCLUDED.price_egp,
    duration_days = EXCLUDED.duration_days;

-- 4. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    plan_id TEXT REFERENCES subscription_plans(id),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically create a 7-day trial subscription when a workshop is created
CREATE OR REPLACE FUNCTION handle_new_workshop_trial()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (workshop_id, plan_id, start_date, end_date, status)
    VALUES (NEW.id, NULL, now(), now() + INTERVAL '7 days', 'trial');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_workshop_created
    AFTER INSERT ON workshops
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_workshop_trial();

-- 5. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('fawry', 'instapay', 'vodafone_cash')),
    transaction_ref TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_review', 'confirmed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create glass_types table
CREATE TABLE IF NOT EXISTS glass_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    total_cost NUMERIC NOT NULL,
    deposit NUMERIC NOT NULL DEFAULT 0,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create custom_buttons table
CREATE TABLE IF NOT EXISTS custom_buttons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create print_settings table
CREATE TABLE IF NOT EXISTS print_settings (
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE PRIMARY KEY,
    workshop_name TEXT,
    owner_name TEXT,
    tax_number TEXT,
    address TEXT,
    phone TEXT,
    footer_note TEXT
);

-- Helper functions for RLS Policies
CREATE OR REPLACE FUNCTION get_user_workshops()
RETURNS TABLE (w_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT wm.workshop_id 
    FROM workshop_members wm 
    WHERE wm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to get user role in a workshop
CREATE OR REPLACE FUNCTION get_user_role(w_id UUID)
RETURNS TEXT AS $$
DECLARE
    u_role TEXT;
BEGIN
    SELECT role INTO u_role 
    FROM workshop_members 
    WHERE workshop_id = w_id AND user_id = auth.uid();
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create workshop with owner in a single call
CREATE OR REPLACE FUNCTION create_workshop_with_owner(workshop_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_workshop_id UUID;
BEGIN
    -- 1. Insert workshop
    INSERT INTO workshops (name) VALUES (workshop_name) RETURNING id INTO new_workshop_id;
    
    -- 2. Insert member as owner
    INSERT INTO workshop_members (workshop_id, user_id, role) 
    VALUES (new_workshop_id, auth.uid(), 'owner');
    
    RETURN new_workshop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Enablement
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE glass_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_settings ENABLE ROW LEVEL SECURITY;

-- Subscription plans are public read
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (true);

-- Workshops policies
CREATE POLICY "Users can view workshops they are members of" ON workshops
    FOR SELECT USING (id IN (SELECT w_id FROM get_user_workshops()));

CREATE POLICY "Owners can update their workshop details" ON workshops
    FOR UPDATE USING (
        id IN (
            SELECT wm.workshop_id 
            FROM workshop_members wm 
            WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
        )
    );

-- Workshop members policies
CREATE POLICY "Members can view other members in the same workshop" ON workshop_members
    FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));

CREATE POLICY "Owners can invite/manage members" ON workshop_members
    FOR ALL USING (
        workshop_id IN (
            SELECT wm.workshop_id 
            FROM workshop_members wm 
            WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
        )
    );

-- Subscriptions policies
CREATE POLICY "Members can view subscription details" ON subscriptions
    FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));

CREATE POLICY "Owners can create/update subscriptions" ON subscriptions
    FOR ALL USING (
        workshop_id IN (
            SELECT wm.workshop_id 
            FROM workshop_members wm 
            WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
        )
    );

-- Payments policies
CREATE POLICY "Members can view payment history" ON payments
    FOR SELECT USING (
        subscription_id IN (
            SELECT s.id 
            FROM subscriptions s 
            WHERE s.workshop_id IN (SELECT w_id FROM get_user_workshops())
        )
    );

CREATE POLICY "Owners can create payments (request review)" ON payments
    FOR INSERT WITH CHECK (
        subscription_id IN (
            SELECT s.id 
            FROM subscriptions s 
            WHERE s.workshop_id IN (
                SELECT wm.workshop_id 
                WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
            )
        )
    );

CREATE POLICY "Owners can update payment details" ON payments
    FOR UPDATE USING (
        subscription_id IN (
            SELECT s.id 
            FROM subscriptions s 
            WHERE s.workshop_id IN (
                SELECT wm.workshop_id 
                WHERE wm.user_id = auth.uid() AND wm.role = 'owner'
            )
        )
    );

-- Core tables policies (glass_types, orders, custom_buttons, print_settings)
-- Select allowed for all members
CREATE POLICY "Members can view glass types" ON glass_types FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));
CREATE POLICY "Members can view orders" ON orders FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));
CREATE POLICY "Members can view custom buttons" ON custom_buttons FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));
CREATE POLICY "Members can view print settings" ON print_settings FOR SELECT USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));

-- Glass Types: Owners & Accountants & Employees can manage
CREATE POLICY "Authorized members can manage glass types" ON glass_types
    FOR ALL USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));

-- Custom Buttons: Owners & Accountants can manage
CREATE POLICY "Owners and Accountants can manage custom buttons" ON custom_buttons
    FOR ALL USING (
        workshop_id IN (SELECT w_id FROM get_user_workshops()) 
        AND get_user_role(workshop_id) IN ('owner', 'accountant')
    );

-- Orders: Employees can insert/update, Accountants can do all, Owner can do all
CREATE POLICY "Members can insert orders" ON orders
    FOR INSERT WITH CHECK (workshop_id IN (SELECT w_id FROM get_user_workshops()));

CREATE POLICY "Members can update orders" ON orders
    FOR UPDATE USING (workshop_id IN (SELECT w_id FROM get_user_workshops()));

CREATE POLICY "Owners and Accountants can delete orders" ON orders
    FOR DELETE USING (
        workshop_id IN (SELECT w_id FROM get_user_workshops())
        AND get_user_role(workshop_id) IN ('owner', 'accountant')
    );

-- Print Settings: Owner & Accountant can update
CREATE POLICY "Owners and Accountants can manage print settings" ON print_settings
    FOR ALL USING (
        workshop_id IN (SELECT w_id FROM get_user_workshops())
        AND get_user_role(workshop_id) IN ('owner', 'accountant')
    );
