"use client"

// This hook is no longer used and can be removed.
// The file is kept to avoid breaking imports in other files during the transition.
// All toast() calls have been replaced with console.log() or console.error().
export const useToast = () => {
    return {
        toast: (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
            if (options.variant === 'destructive') {
                console.error(`[DEPRECATED TOAST] ${options.title}: ${options.description}`);
            } else {
                console.log(`[DEPRECATED TOAST] ${options.title}: ${options.description}`);
            }
        },
    };
};
