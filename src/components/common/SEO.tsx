import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  schema?: object;
}

export const SEO: React.FC<SEOProps> = ({ 
  title = 'Nexury | Conecta con la elegancia de lo digital', 
  description = 'La red social más exclusiva y profesional diseñada para creadores y visionarios. Únete a la élite digital.',
  keywords = 'red social, nexury, comunidad, compartir, noticias, tecnología, lujo, profesional',
  image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  url = window.location.origin,
  type = 'website',
  author = 'Nexury Team',
  schema
}) => {
  const siteTitle = (title && typeof title === 'string' && title.includes('Nexury')) ? title : `${title || 'Nexury'} | Nexury`;
  const canonicalUrl = url.endsWith('/') ? url : `${url}/`;

  // Default Organization Schema
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nexury",
    "url": window.location.origin,
    "logo": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&h=200&auto=format&fit=crop",
    "sameAs": [
      "https://twitter.com/nexury",
      "https://facebook.com/nexury"
    ]
  };

  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#0f172a" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Nexury" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@nexury" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema || defaultSchema)}
      </script>
    </Helmet>
  );
};
