
import React from 'react';
import { Shield, Lock, FileText, X, Globe, Cookie, Users, Bell, Mail, Server } from 'lucide-react';

export const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
    <div className="bg-slate-900 border border-white/10 max-w-4xl w-full rounded-2xl shadow-2xl relative h-fit min-h-[50vh] mb-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10">
            <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="p-8 md:p-12 space-y-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="w-16 h-16 bg-cyan-900/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <Shield className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
                    <p className="text-slate-400 text-sm mt-1">Effective Date: October 26, 2023 • Version 1.3</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-3 space-y-12">
                    
                    {/* 1. Collection */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><FileText className="w-5 h-5 text-cyan-500" /></div>
                            1. Data Collection
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed space-y-4">
                            <p>We collect information to provide better services to all our users. The types of data we collect include:</p>
                            <ul className="list-disc pl-4 space-y-2 marker:text-cyan-500">
                                <li><strong>Personal Identification:</strong> Name, email address, and authentication tokens when you sign in via our provider.</li>
                                <li><strong>Usage Data:</strong> Information on how the Service is accessed and used (e.g., page views, feature usage, session duration).</li>
                                <li><strong>Audio Input:</strong> Raw audio data processed locally via the Web Audio API for features like "Audio Identifier" and "Tuner". <em>Note: Raw audio is not uploaded to our servers unless you explicitly save a recording.</em></li>
                                <li><strong>Device Information:</strong> Browser type, version, and operating system to ensure compatibility and performance.</li>
                            </ul>
                        </div>
                    </section>

                    {/* 2. Usage */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Server className="w-5 h-5 text-purple-500" /></div>
                            2. How We Use Your Data
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p className="mb-4">MusetoN uses the collected data for the following purposes:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <strong className="text-white block mb-1">Service Provision</strong>
                                    To operate and maintain the MusetoN platform, including saving your musical projects and progress.
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <strong className="text-white block mb-1">AI Personalization</strong>
                                    To generate relevant music theory insights and exercises based on your skill level and history.
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <strong className="text-white block mb-1">Communication</strong>
                                    To notify you about changes to our Service, security alerts, and support messages.
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <strong className="text-white block mb-1">Improvement</strong>
                                    To monitor the usage of our Service and detect, prevent, and address technical issues.
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Sharing */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Users className="w-5 h-5 text-emerald-500" /></div>
                            3. Data Sharing & Disclosure
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p>We do not sell your personal data. We may share your information in the following situations:</p>
                            <ul className="list-disc pl-4 mt-2 space-y-2 marker:text-emerald-500">
                                <li><strong>Service Providers:</strong> We employ third-party companies (e.g., Google Firebase, Gemini API) to facilitate our Service. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</li>
                                <li><strong>Legal Requirements:</strong> We may disclose your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</li>
                            </ul>
                        </div>
                    </section>

                    {/* 4. Cookies */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Cookie className="w-5 h-5 text-yellow-500" /></div>
                            4. Cookies & Local Storage
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p className="mb-2">We use Cookies and similar tracking technologies (Local Storage, IndexedDB) to track the activity on our Service and hold certain information.</p>
                            <p className="mb-4"><strong>Storage Mechanisms:</strong></p>
                            <ul className="list-disc pl-4 space-y-1 marker:text-yellow-500">
                                <li><strong>Essential:</strong> Required for authentication and security.</li>
                                <li><strong>Preferences:</strong> Used to remember your settings (e.g., Synth patches, Volume levels).</li>
                                <li><strong>Analytics:</strong> Used to understand how you interact with the app.</li>
                            </ul>
                            <p className="mt-4 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-500/20 text-yellow-200">
                                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service (e.g., Saving Projects).
                            </p>
                        </div>
                    </section>

                    {/* 5. User Rights */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Shield className="w-5 h-5 text-blue-500" /></div>
                            5. Your Data Rights (GDPR & CCPA)
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p className="mb-3">Depending on your location, you have specific rights regarding your personal data:</p>
                            <div className="space-y-3">
                                <div className="border-l-2 border-blue-500 pl-4">
                                    <strong className="text-white block">The right to access</strong>
                                    You have the right to request copies of your personal data.
                                </div>
                                <div className="border-l-2 border-blue-500 pl-4">
                                    <strong className="text-white block">The right to rectification</strong>
                                    You have the right to request that we correct any information you believe is inaccurate.
                                </div>
                                <div className="border-l-2 border-blue-500 pl-4">
                                    <strong className="text-white block">The right to erasure ("Right to be forgotten")</strong>
                                    You have the right to request that we erase your personal data, under certain conditions.
                                </div>
                                <div className="border-l-2 border-blue-500 pl-4">
                                    <strong className="text-white block">The right to non-discrimination (CCPA)</strong>
                                    We will not discriminate against you for exercising any of your CCPA rights.
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 6. Security */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Lock className="w-5 h-5 text-red-500" /></div>
                            6. Data Security
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p>
                                The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means (SSL encryption, secure OAuth flows) to protect your Personal Data, we cannot guarantee its absolute security.
                            </p>
                        </div>
                    </section>

                    {/* 7. Children */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Users className="w-5 h-5 text-pink-500" /></div>
                            7. Children's Privacy
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p>
                                Our Service does not address anyone under the age of 13 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your Children have provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.
                            </p>
                        </div>
                    </section>

                    {/* 8. International Transfers */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Globe className="w-5 h-5 text-indigo-500" /></div>
                            8. International Data Transfers
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p>
                                Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from your jurisdiction.
                            </p>
                            <p className="mt-2">
                                If you are located outside United States and choose to provide information to us, please note that we transfer the data, including Personal Data, to United States and process it there.
                            </p>
                        </div>
                    </section>

                    {/* 9. Updates */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Bell className="w-5 h-5 text-orange-500" /></div>
                            9. Changes to This Policy
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p>
                                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes.
                            </p>
                        </div>
                    </section>

                    {/* 10. Contact */}
                    <section className="space-y-4 pb-8">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg"><Mail className="w-5 h-5 text-slate-200" /></div>
                            10. Contact Us
                        </h2>
                        <div className="pl-14 text-slate-300 text-sm leading-relaxed">
                            <p className="mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 inline-block min-w-[300px]">
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-cyan-400" />
                                        <span className="text-white">privacy@museton.ai</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Globe className="w-4 h-4 text-cyan-400" />
                                        <span className="text-white">www.museton.ai/support</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    </div>
  </div>
);
