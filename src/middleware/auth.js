import jwt from 'jsonwebtoken';

export const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Accès non autorisé. Jeton manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || '7bhil_portfolio_super_secret_jwt_key_2026_benin';

    const decoded = jwt.verify(token, secret);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Jeton invalide ou expiré. Veuillez vous re-connecter.' });
  }
};
