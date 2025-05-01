import Link from 'next/link';
import Image from 'next/image';
import ContactForm from '../components/ContactForm';

export default function Home() {
  const stats = [
    { title: '$200K', description: 'Paid to creators' },
    { title: '9,000', description: 'Active clippers' },
    { title: '5B', description: 'Organic views' },
    { title: '450', description: 'Campaigns launched' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text and CTA */}
          <div className="space-y-8">
            <h1 className="text-5xl font-bold leading-tight">
              The All-in-One Tool for <span className="text-primary">Virality</span>
            </h1>
            <p className="text-xl text-gray-600">
              ViralClip turns passionate creators into a viral engine for brands—paying only for real views, real engagement, and real impact.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link 
                href="/dashboard" 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-medium transition-colors"
              >
                Join Now
              </Link>
              <Link 
                href="/partner" 
                className="border border-primary text-primary hover:bg-primary/5 px-8 py-3 rounded-md font-medium transition-colors"
              >
                Partner With Us
              </Link>
            </div>
          </div>
          
          {/* Right Column - Videos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] relative shadow-xl">
              {/* Video placeholder 1 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] relative shadow-xl mt-12">
              {/* Video placeholder 2 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl p-8 text-center shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-4xl font-bold text-primary mb-2">{stat.title}</h2>
                <p className="text-gray-600">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to go viral? Hit us up</h2>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
