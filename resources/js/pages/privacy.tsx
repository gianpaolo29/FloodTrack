import { Head, Link, usePage } from '@inertiajs/react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { login } from '@/routes';
import { useAppearance } from '@/hooks/use-appearance';

function useScrolled(threshold = 20) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const h = () => setScrolled(window.scrollY > threshold);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, [threshold]);
    return scrolled;
}

export default function Privacy() {
    const { auth } = usePage().props;
    const scrolled = useScrolled();
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const sectionClass = `text-[15px] leading-relaxed ${isDark ? 'text-white/60' : 'text-neutral-600'}`;
    const headingClass = `text-lg font-semibold mb-3 ${isDark ? 'text-white/90' : 'text-neutral-800'}`;

    return (
        <>
            <Head title="Privacy Policy" />

            <div className={`min-h-screen ${isDark ? 'bg-[#06090f] text-white' : 'bg-white text-neutral-900'}`}>
                {/* ── Navbar ─────────────────────────────────────────── */}
                <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
                    scrolled
                        ? isDark
                            ? 'bg-[#06090f]/70 border-b border-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150'
                            : 'bg-white/80 border-b border-neutral-200/50 shadow-lg shadow-neutral-200/40 backdrop-blur-2xl backdrop-saturate-150'
                        : 'bg-transparent'
                }`}>
                    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
                        <Link href="/" className="group flex items-center gap-3">
                            <div className="relative flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 transition-all duration-300 group-hover:shadow-blue-500/40 group-hover:scale-110">
                                <AppLogoIcon className="size-5 fill-current text-white drop-shadow-sm" />
                                <div className="absolute inset-[1px] rounded-[13px] bg-gradient-to-b from-white/25 to-transparent" />
                            </div>
                            <span className="text-[1.15rem] font-bold tracking-tight">
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>Flood</span>
                                <span className={`bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}>Track</span>
                            </span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <Link href="/" className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors duration-200 rounded-xl ${isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.04]' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}>
                                <ArrowLeft className="size-4" />
                                Back
                            </Link>
                        </div>
                    </nav>
                </header>

                {/* ── Content ─────────────────────────────────────────── */}
                <main className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 lg:px-8">
                    <div className="mb-10 flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                            <Shield className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>Privacy Policy</h1>
                            <p className={`text-sm mt-1 ${isDark ? 'text-white/30' : 'text-neutral-400'}`}>Last updated: August 24, 2026</p>
                        </div>
                    </div>

                    <div className={`space-y-8 rounded-2xl border p-6 sm:p-10 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/50'}`}>
                        <section>
                            <h2 className={headingClass}>1. Introduction</h2>
                            <p className={sectionClass}>
                                FloodTrack ("we", "our", or "us") is a community-driven flood and hazard reporting platform
                                developed in partnership with the Municipal Disaster Risk Reduction and Management Office (MDRRMO)
                                of Nasugbu, Batangas. This Privacy Policy explains how we collect, use, disclose, and protect
                                your personal information when you use our mobile application and web services.
                            </p>
                        </section>

                        <section>
                            <h2 className={headingClass}>2. Information We Collect</h2>
                            <p className={`${sectionClass} mb-3`}>We may collect the following types of information:</p>
                            <ul className={`${sectionClass} list-disc pl-6 space-y-2`}>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Account Information:</strong> Name, email address, phone number, and password when you register.</li>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Location Data:</strong> Your device's GPS coordinates when submitting flood reports or using location-based features, only with your permission.</li>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Report Data:</strong> Photos, descriptions, severity levels, and other details you provide when filing flood or hazard reports.</li>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Device Information:</strong> Device type, operating system, and push notification tokens for sending alerts.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={headingClass}>3. How We Use Your Information</h2>
                            <ul className={`${sectionClass} list-disc pl-6 space-y-2`}>
                                <li>To process and display flood and hazard reports to responders and the community.</li>
                                <li>To send emergency alerts, notifications, and evacuation advisories.</li>
                                <li>To coordinate disaster response with MDRRMO and authorized responders.</li>
                                <li>To improve our services, analyze trends, and enhance platform reliability.</li>
                                <li>To verify user identity and prevent misuse of the platform.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={headingClass}>4. Information Sharing</h2>
                            <p className={sectionClass}>
                                We do not sell your personal information. We may share your data with:
                            </p>
                            <ul className={`${sectionClass} list-disc pl-6 space-y-2 mt-3`}>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>MDRRMO and Emergency Responders:</strong> Report details and location data to facilitate disaster response.</li>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Local Government Units:</strong> Aggregated, anonymized data for disaster preparedness planning.</li>
                                <li><strong className={isDark ? 'text-white/80' : 'text-neutral-700'}>Service Providers:</strong> Third-party services that help us operate the platform (e.g., hosting, push notifications), under strict data protection agreements.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={headingClass}>5. Data Security</h2>
                            <p className={sectionClass}>
                                We implement appropriate technical and organizational measures to protect your personal information,
                                including encryption in transit and at rest, secure authentication, and access controls.
                                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className={headingClass}>6. Data Retention</h2>
                            <p className={sectionClass}>
                                We retain your personal information for as long as your account is active or as needed to provide
                                services. Report data may be retained for historical analysis and disaster preparedness purposes.
                                You may request deletion of your account and personal data by contacting us.
                            </p>
                        </section>

                        <section>
                            <h2 className={headingClass}>7. Your Rights</h2>
                            <p className={`${sectionClass} mb-3`}>In accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to:</p>
                            <ul className={`${sectionClass} list-disc pl-6 space-y-2`}>
                                <li>Access your personal data held by FloodTrack.</li>
                                <li>Correct any inaccurate or incomplete personal information.</li>
                                <li>Request erasure or blocking of your personal data.</li>
                                <li>Object to the processing of your data under certain circumstances.</li>
                                <li>Lodge a complaint with the National Privacy Commission.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={headingClass}>8. Children's Privacy</h2>
                            <p className={sectionClass}>
                                FloodTrack is not intended for use by children under the age of 13. We do not knowingly collect
                                personal information from children. If you believe we have collected data from a child,
                                please contact us so we can promptly remove it.
                            </p>
                        </section>

                        <section>
                            <h2 className={headingClass}>9. Changes to This Policy</h2>
                            <p className={sectionClass}>
                                We may update this Privacy Policy from time to time. We will notify you of any significant changes
                                through the app or via email. Your continued use of FloodTrack after changes are posted constitutes
                                acceptance of the updated policy.
                            </p>
                        </section>

                        <section>
                            <h2 className={headingClass}>10. Contact Us</h2>
                            <p className={sectionClass}>
                                If you have questions or concerns about this Privacy Policy or your personal data, please contact us at:
                            </p>
                            <div className={`mt-3 rounded-xl border p-4 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-neutral-200 bg-white'}`}>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-neutral-700'}`}>FloodTrack Team</p>
                                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>In partnership with MDRRMO Nasugbu, Batangas</p>
                            </div>
                        </section>
                    </div>
                </main>

                {/* ── Footer ─────────────────────────────────────────── */}
                <footer className={`relative border-t px-4 py-12 sm:px-6 sm:py-16 ${isDark ? 'border-white/[0.03]' : 'border-neutral-100 bg-gradient-to-b from-[#fafbfc] to-white'}`}>
                    <div className="mx-auto max-w-7xl">
                        <div className={`flex flex-col items-center justify-between gap-3 sm:flex-row`}>
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/15">
                                    <AppLogoIcon className="size-[18px] fill-current text-white" />
                                </div>
                                <span className={`text-sm font-bold ${isDark ? 'text-white/50' : 'text-neutral-500'}`}>FloodTrack</span>
                            </div>
                            <p className={`text-[12px] ${isDark ? 'text-white/15' : 'text-neutral-400'}`}>&copy; {new Date().getFullYear()} FloodTrack. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
