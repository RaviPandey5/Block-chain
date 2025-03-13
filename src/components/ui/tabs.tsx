import * as React from "react";
import { cn } from "../../lib/utils";

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, defaultValue, onValueChange, ...props }, ref) => {
    const contextValue = React.useMemo(() => {
      return {
        value,
        defaultValue,
        onChange: onValueChange,
      };
    }, [value, defaultValue, onValueChange]);

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          className={cn("space-y-2", className)}
          ref={ref}
          {...props}
        />
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg bg-white/5 p-1 text-white",
          className
        )}
        {...props}
      />
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isActive = context?.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-value={value}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-purple-500/80 text-white shadow-sm": isActive,
            "text-white/70 hover:text-white hover:bg-white/10": !isActive,
          },
          className
        )}
        onClick={() => context?.onChange?.(value)}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isActive = context?.value === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        data-value={value}
        className={cn("mt-2 focus-visible:outline-none", className)}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

// Context to manage active tab state
interface TabsContextValue {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function useTabs(defaultValue: string) {
  const [value, setValue] = React.useState(defaultValue);
  
  return {
    value,
    onChange: setValue,
    Provider: ({ children }: { children: React.ReactNode }) => (
      <TabsContext.Provider value={{ value, onChange: setValue }}>
        {children}
      </TabsContext.Provider>
    ),
  };
}

export { Tabs, TabsList, TabsTrigger, TabsContent }; 