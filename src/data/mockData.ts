// NOTE: Types and CATEGORIES live in `./catalogTypes` and are re-exported here
// for backwards compatibility. The ESTABLISHMENTS literal below is dev-only —
// Vite tree-shakes it out of production bundles via `import.meta.env.DEV`.
export type {
  ServiceType,
  CategoryKey,
  ProductOption,
  Product,
  MenuCategory,
  Review,
  Establishment,
  ProductWithEstablishment,
} from "./catalogTypes";
export { CATEGORIES } from "./catalogTypes";
import type { Establishment, ProductWithEstablishment } from "./catalogTypes";

const img = (q: string, w = 800) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=${w}&q=70`;

const DEV_ESTABLISHMENTS: Establishment[] = import.meta.env.DEV ? [
  {
    id: "1", slug: "forno-da-vila", name: "Forno da Vila",
    tagline: "Pizza de forno a lenha, do jeito da nonna",
    description: "Pizzaria artesanal com massa de fermentação natural e ingredientes da região.",
    story: "Aberta em 2012 por uma família ítalo-brasileira, a Forno da Vila virou ponto de encontro da cidade.",
    category: "pizzarias", categoryLabel: "Pizzaria",
    cover: img("photo-1513104890138-7c749659a591"),
    logo: img("photo-1565299624946-b28f40a0ae38", 200),
    gallery: [img("photo-1571997478779-2adcbbe9ab2f"), img("photo-1604382354936-07c5d9983bd3"), img("photo-1574071318508-1cdbab80d002")],
    address: "Rua das Palmeiras, 240 - Centro",
    neighborhood: "Centro", distanceKm: 1.2,
    openNow: true, hours: "Ter-Dom 18h-23h", etaMin: 45,
    rating: 4.8, reviewsCount: 312,
    whatsapp: "5511999990001",
    services: ["entrega", "retirada", "local"],
    payments: ["Pix", "Crédito", "Débito", "Dinheiro"],
    deliveryFee: 8,
    badges: ["verificado", "recomendado", "promocao"],
    menuType: "exclusivo",
    brandColor: "20 85% 45%",
    menuCategories: [
      { id: "c1", name: "Pizzas Salgadas" },
      { id: "c2", name: "Pizzas Doces" },
      { id: "c3", name: "Bebidas" },
    ],
    products: [
      { id: "p1", name: "Pizza Margherita", description: "Molho de tomate San Marzano, muçarela de búfala, manjericão fresco e azeite extra virgem.", price: 58, image: img("photo-1604382354936-07c5d9983bd3"), category: "c1", featured: true, popular: true,
        options: [{ id: "o1", name: "Borda recheada catupiry", price: 8 }, { id: "o2", name: "Extra muçarela", price: 6 }],
        removable: ["Manjericão", "Azeite"] },
      { id: "p2", name: "Pizza Calabresa Artesanal", description: "Calabresa defumada, cebola roxa e azeitona preta.", price: 62, image: img("photo-1571997478779-2adcbbe9ab2f"), category: "c1", promo: true, popular: true,
        options: [{ id: "o3", name: "Borda recheada cheddar", price: 8 }] },
      { id: "p3", name: "Pizza Quatro Queijos", description: "Muçarela, provolone, parmesão e gorgonzola.", price: 68, image: img("photo-1593504049359-74330189a345"), category: "c1" },
      { id: "p4", name: "Pizza Romeu e Julieta", description: "Muçarela com goiabada cremosa.", price: 52, image: img("photo-1565299624946-b28f40a0ae38"), category: "c2" },
      { id: "p5", name: "Refrigerante 2L", description: "Coca-Cola, Guaraná ou Sprite.", price: 14, image: img("photo-1622483767028-3f66f32aef97"), category: "c3" },
    ],
    reviews: [
      { id: "r1", author: "Marina S.", rating: 5, text: "Melhor pizza da região! Massa leve, sabor incrível.", date: "há 3 dias", photo: img("photo-1574071318508-1cdbab80d002", 400), reply: "Obrigado, Marina! Esperamos você de novo 🍕" },
      { id: "r2", author: "Carlos T.", rating: 5, text: "Atendimento ótimo e entrega rápida.", date: "há 1 semana" },
      { id: "r3", author: "Júlia P.", rating: 4, text: "Muito boa, só achei a borda recheada um pouco salgada.", date: "há 2 semanas" },
    ],
  },
  {
    id: "2", slug: "acai-da-praca", name: "Açaí da Praça",
    tagline: "Açaí cremoso direto do Norte",
    description: "Açaí 100% natural batido na hora com mais de 20 acompanhamentos.",
    category: "acai", categoryLabel: "Açaiteria",
    cover: img("photo-1590301157890-4810ed352733"),
    logo: img("photo-1488477181946-6428a0291777", 200),
    address: "Praça Central, 15", neighborhood: "Centro", distanceKm: 0.4,
    openNow: true, hours: "Todos os dias 12h-22h", etaMin: 25,
    rating: 4.7, reviewsCount: 188,
    whatsapp: "5511999990002",
    services: ["entrega", "retirada", "local"],
    payments: ["Pix", "Crédito", "Débito", "Dinheiro"],
    deliveryFee: 5,
    badges: ["verificado", "turistas"],
    menuType: "essencial",
    menuCategories: [{ id: "a1", name: "Açaís" }, { id: "a2", name: "Vitaminas" }],
    products: [
      { id: "ap1", name: "Açaí 500ml", description: "Açaí puro batido na hora.", price: 22, image: img("photo-1590301157890-4810ed352733"), category: "a1", popular: true,
        options: [{ id: "ao1", name: "Granola", price: 3 }, { id: "ao2", name: "Leite condensado", price: 3 }, { id: "ao3", name: "Morango", price: 4 }] },
      { id: "ap2", name: "Açaí 700ml", description: "Tamanho família.", price: 28, image: img("photo-1638176067000-9e2734e0f4a6"), category: "a1" },
      { id: "ap3", name: "Vitamina de banana", description: "Banana, leite e aveia.", price: 14, image: img("photo-1623065422902-30a2d299bbe4"), category: "a2" },
    ],
    reviews: [
      { id: "ar1", author: "Pedro A.", rating: 5, text: "Açaí mais grosso da cidade!", date: "ontem" },
    ],
  },
  {
    id: "3", slug: "cantina-da-vovo", name: "Cantina da Vovó",
    tagline: "Comida caseira como a da sua avó",
    description: "Marmitas e pratos feitos com ingredientes frescos todos os dias.",
    category: "caseira", categoryLabel: "Comida caseira",
    cover: img("photo-1546069901-ba9599a7e63c"),
    logo: img("photo-1414235077428-338989a2e8c0", 200),
    address: "Rua da Saudade, 88", neighborhood: "Jardim", distanceKm: 2.1,
    openNow: true, hours: "Seg-Sex 11h-15h", etaMin: 30,
    rating: 4.9, reviewsCount: 421,
    whatsapp: "5511999990003",
    services: ["entrega", "retirada"],
    payments: ["Pix", "Dinheiro"],
    deliveryFee: 6,
    badges: ["verificado", "recomendado"],
    menuType: "essencial",
    menuCategories: [{ id: "m1", name: "Marmitas" }, { id: "m2", name: "Sobremesas" }],
    products: [
      { id: "mp1", name: "Marmita Tradicional", description: "Arroz, feijão, bife acebolado, batata frita e salada.", price: 24, image: img("photo-1546069901-ba9599a7e63c"), category: "m1", popular: true },
      { id: "mp2", name: "Marmita Fitness", description: "Arroz integral, frango grelhado e legumes.", price: 26, image: img("photo-1567620905732-2d1ec7ab7445"), category: "m1" },
      { id: "mp3", name: "Pudim de leite", description: "Receita da casa.", price: 9, image: img("photo-1551024506-0bccd828d307"), category: "m2" },
    ],
    reviews: [{ id: "mr1", author: "Ana L.", rating: 5, text: "Tempero de casa, divino.", date: "há 4 dias" }],
  },
  {
    id: "4", slug: "burger-da-esquina", name: "Burger da Esquina",
    tagline: "Smash burgers e batatas crocantes",
    description: "Hamburgueria artesanal com carne 100% angus.",
    category: "lanches", categoryLabel: "Hamburgueria",
    cover: img("photo-1568901346375-23c9450c58cd"),
    logo: img("photo-1550547660-d9450f859349", 200),
    address: "Av. Brasil, 1200", neighborhood: "Vila Nova", distanceKm: 3.5,
    openNow: false, hours: "Qua-Dom 18h-00h", etaMin: 40,
    rating: 4.6, reviewsCount: 257,
    whatsapp: "5511999990004",
    services: ["entrega", "retirada", "local"],
    payments: ["Pix", "Crédito", "Débito"],
    deliveryFee: 10,
    badges: ["verificado", "promocao"],
    menuType: "exclusivo",
    brandColor: "0 0% 15%",
    menuCategories: [{ id: "b1", name: "Burgers" }, { id: "b2", name: "Acompanhamentos" }],
    products: [
      { id: "bp1", name: "Combo Smash Duplo", description: "Dois discos de angus, queijo cheddar e molho da casa. Acompanha batata e bebida.", price: 48, image: img("photo-1568901346375-23c9450c58cd"), category: "b1", featured: true, popular: true,
        options: [
          { id: "bo1", name: "Batata Média", price: 0 }, 
          { id: "bo2", name: "Batata Grande", price: 6 },
          { id: "bo3", name: "Coca-Cola 350ml", price: 0 },
          { id: "bo4", name: "Suco de Laranja", price: 4 }
        ] },
      { id: "bp2", name: "Cheese Salada", description: "Burger 150g, alface, tomate e maionese verde.", price: 26, image: img("photo-1572802419224-296b0aeee0d9"), category: "b1", promo: true },
      { id: "bp3", name: "Batata Rústica", description: "Porção 300g com cheddar e bacon.", price: 22, image: img("photo-1573080496219-bb080dd4f877"), category: "b2" },
    ],
    reviews: [{ id: "br1", author: "Lucas R.", rating: 5, text: "Smash perfeito!", date: "há 5 dias" }],
  },
  {
    id: "5", slug: "cafe-do-largo", name: "Café do Largo",
    tagline: "O melhor café da região",
    description: "Cafeteria de especialidade com grãos torrados na cidade.",
    category: "cafes", categoryLabel: "Cafeteria",
    cover: img("photo-1501339847302-ac426a4a7cbb"),
    logo: img("photo-1495474472287-4d71bcdd2085", 200),
    address: "Largo São Pedro, 30", neighborhood: "Centro Histórico", distanceKm: 0.8,
    openNow: true, hours: "Todos os dias 7h-20h", etaMin: 20,
    rating: 4.9, reviewsCount: 540,
    whatsapp: "5511999990005",
    services: ["retirada", "local"],
    payments: ["Pix", "Crédito", "Débito"],
    deliveryFee: null,
    badges: ["verificado", "turistas", "recomendado"],
    menuType: "essencial",
    menuCategories: [{ id: "cf1", name: "Cafés" }, { id: "cf2", name: "Doces" }],
    products: [
      { id: "cp1", name: "Cappuccino", description: "Espresso, leite vaporizado e canela.", price: 12, image: img("photo-1572442388796-11668a67e53d"), category: "cf1", popular: true },
      { id: "cp2", name: "Bolo de fubá", description: "Receita da casa, fatia generosa.", price: 9, image: img("photo-1486427944299-d1955d23e34d"), category: "cf2" },
    ],
    reviews: [{ id: "cr1", author: "Renata M.", rating: 5, text: "Ambiente lindo e café maravilhoso.", date: "há 2 dias" }],
  },
  {
    id: "6", slug: "bar-do-zeca", name: "Bar do Zeca",
    tagline: "Petiscos e cerveja gelada",
    description: "Bar tradicional com porções fartas e samba ao vivo nos finais de semana.",
    category: "bares", categoryLabel: "Bar e petiscos",
    cover: img("photo-1514933651103-005eec06c04b"),
    logo: img("photo-1559526324-4b87b5e36e44", 200),
    address: "Rua do Comércio, 502", neighborhood: "Centro", distanceKm: 1.0,
    openNow: true, hours: "Ter-Dom 17h-01h", etaMin: 35,
    rating: 4.5, reviewsCount: 198,
    whatsapp: "5511999990006",
    services: ["entrega", "local"],
    payments: ["Pix", "Crédito", "Débito", "Dinheiro"],
    deliveryFee: 7,
    badges: ["recomendado", "turistas"],
    menuType: "essencial",
    menuCategories: [{ id: "z1", name: "Petiscos" }, { id: "z2", name: "Bebidas" }],
    products: [
      { id: "zp1", name: "Porção de Calabresa", description: "Acompanha pão e vinagrete.", price: 38, image: img("photo-1625937329935-287441889b58"), category: "z1", popular: true },
      { id: "zp2", name: "Pastel de Carne", description: "6 unidades.", price: 28, image: img("photo-1626804475297-41608ea09aeb"), category: "z1" },
      { id: "zp3", name: "Chopp 300ml", description: "Sempre gelado.", price: 9, image: img("photo-1535958636474-b021ee887b13"), category: "z2" },
    ],
    reviews: [{ id: "zr1", author: "Diego F.", rating: 5, text: "Petisco generoso e cerveja no ponto.", date: "há 1 semana" }],
  },
] : [];

export const ESTABLISHMENTS: Establishment[] = DEV_ESTABLISHMENTS;

export const getEstablishment = (slug: string) =>
  ESTABLISHMENTS.find(e => e.slug === slug);

export interface ProductWithEstablishment extends Product {
  establishment: Establishment;
}

export const getAllProducts = (): ProductWithEstablishment[] =>
  ESTABLISHMENTS.flatMap(e =>
    e.products.map(p => ({ ...p, establishment: e }))
  );

