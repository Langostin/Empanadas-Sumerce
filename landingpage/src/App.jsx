import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Promotions from './components/Promotions';
import Services from './components/Services';
import WhatsAppQR from './components/WhatsAppQR';
import Gallery from './components/Gallery';
import Team from './components/Team';
import Stats from './components/Stats';
import SocialMedia from './components/SocialMedia';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Promotions />
        <Services />
        <WhatsAppQR />
        <Gallery />
        <Team />
        <Stats />
        <SocialMedia />
      </main>
      <Footer />
    </>
  );
}
