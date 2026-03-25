const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setPlan() {
  const plan = process.argv[2];
  const validPlans = ['starter', 'pro', 'agency', 'trial'];

  if (!plan || !validPlans.includes(plan)) {
    console.log(`Please define a valid plan. Usage: node --env-file=.env.local scripts/set-plan.js [${validPlans.join('|')}]`);
    process.exit(1);
  }

  // Updates all subscriptions in the db to the requested plan for local testing
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan })
    .neq('plan', 'placeholder_force_all_update');

  if (error) {
    console.error("Failed to update plan:", error);
  } else {
    console.log(`✅ Successfully updated your active subscription to the '${plan}' tier!`);
    console.log(`Refresh your browser to see the changes.`);
  }
}

setPlan();
