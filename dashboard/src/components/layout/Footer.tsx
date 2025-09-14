
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-200/40 dark:border-gray-700/40 bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <a href="https://LanOnasis.com" className="flex items-center gap-2 text-xl font-semibold tracking-tight mb-4">
              <span className="text-primary">LanOnasis</span>
              <span className="text-foreground">Platform</span>
            </a>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              AI-powered fintech solutions transforming industries across Africa with intelligent compliance, risk management, and seamless payment systems.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:info@LanOnasis.com"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://LanOnasis.com#ecosystem"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#roadmap"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Roadmap
                </a>
              </li>
              <li>
                <a
                  href="https://api.LanOnasis.com/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Status
                </a>
              </li>
              <li>
                <a
                  href="https://docs.LanOnasis.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  API Documentation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://LanOnasis.com#story"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#blog"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#press"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Press
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#partners"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Partners
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.LanOnasis.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://docs.LanOnasis.com/guides"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Guides
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com#security"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Security
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://LanOnasis.com/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200/40 dark:border-gray-700/40 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {year} LanOnasis. All rights reserved.
          </p>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <a
              href="https://LanOnasis.com/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Privacy Policy
            </a>
            <a
              href="https://LanOnasis.com/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Terms of Service
            </a>
            <a
              href="https://LanOnasis.com/cookies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
