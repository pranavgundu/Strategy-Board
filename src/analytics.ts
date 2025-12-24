import posthog from "posthog-js";

let initialized = false;

/**
 * Initializes PostHog analytics client if not already initialized.
 * Safe to call multiple times.
 */
export function initAnalytics(): void {
  if (initialized) return;
  
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  
  if (typeof window !== "undefined" && apiKey) {
    posthog.init(apiKey, {
      api_host: "https://us.i.posthog.com",
      loaded: (posthog) => {
        console.log("PostHog analytics initialized");
      },
    });
    initialized = true;
  }
}

/**
 * Captures an analytics event with optional properties and person properties.
 * 
 * @param eventName - The name of the event to capture
 * @param properties - Optional event properties
 * @param personProperties - Optional person properties to set ($set) or set once ($set_once)
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, any>,
  personProperties?: {
    $set?: Record<string, any>;
    $set_once?: Record<string, any>;
  }
): void {
  if (!initialized || typeof window === "undefined") {
    console.debug(`Analytics not initialized, skipping event: ${eventName}`);
    return;
  }

  const eventProperties = {
    ...properties,
    ...personProperties,
  };

  posthog.capture(eventName, eventProperties);
}

/**
 * Sets the current group for subsequent events.
 * Useful for tracking events at the team/organization level.
 * 
 * @param groupType - The type of group (e.g., 'team', 'organization')
 * @param groupKey - The unique identifier for the group
 */
export function setGroup(groupType: string, groupKey: string): void {
  if (!initialized || typeof window === "undefined") {
    console.debug("Analytics not initialized, skipping group set");
    return;
  }

  posthog.group(groupType, groupKey);
}

/**
 * Identifies the current user with a unique ID and optional properties.
 * 
 * @param userId - Unique identifier for the user
 * @param properties - Optional user properties
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, any>
): void {
  if (!initialized || typeof window === "undefined") {
    console.debug("Analytics not initialized, skipping user identification");
    return;
  }

  posthog.identify(userId, properties);
}
