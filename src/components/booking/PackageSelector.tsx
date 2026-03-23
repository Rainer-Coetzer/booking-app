'use client';

import { motion } from 'framer-motion';
import type { SessionPackage } from '@/lib/constants';

interface Props {
  packages: SessionPackage[];
  selected: SessionPackage | null;
  onSelect: (pkg: SessionPackage) => void;
}

export default function PackageSelector({ packages, selected, onSelect }: Props) {
  return (
    <div>
      <div className="step-header">
        <div className="step-label">Step 1</div>
        <h2 className="step-title">Choose Your Session</h2>
      </div>

      <div className="packages-grid">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`package-card ${selected?.id === pkg.id ? 'selected' : ''}`}
            onClick={() => onSelect(pkg)}
            id={`package-${pkg.id}`}
          >
            <div className="package-name">{pkg.name}</div>
            <div className="package-price">{pkg.price}</div>
            <div className="package-desc">{pkg.description}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
