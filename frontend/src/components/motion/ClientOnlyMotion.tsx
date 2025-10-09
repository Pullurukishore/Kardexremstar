'use client';

import { forwardRef, useEffect, useState } from 'react';
import { motion, HTMLMotionProps, MotionProps } from 'framer-motion';

type ClientOnlyMotionProps = HTMLMotionProps<'div'> &
  MotionProps & {
    as?: keyof JSX.IntrinsicElements;
    // Additional props
    className?: string;
    children?: React.ReactNode;
  };

function ClientOnlyMotionInner(
  { as: Tag = 'div', ...props }: ClientOnlyMotionProps,
  ref: React.ForwardedRef<any>
) {
  const [mounted, setMounted] = useState(false);
  const MotionComponent = (motion as any)[Tag as any] || motion.div;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const Element: any = Tag as any;
    return <Element ref={ref} {...(props as any)} />;
  }

  return <MotionComponent ref={ref} {...(props as any)} />;
}

// Create the forwarded ref component
const ClientOnlyMotion = forwardRef(ClientOnlyMotionInner) as unknown as (
  props: ClientOnlyMotionProps & { ref?: React.ForwardedRef<any> }
) => React.ReactElement;

(ClientOnlyMotion as any).displayName = 'ClientOnlyMotion';

export default ClientOnlyMotion;